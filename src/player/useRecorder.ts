import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addRecording,
  deleteRecording,
  listRecordings,
  releaseUrl,
  type Recording,
  type RecordingSync,
} from './recordingsDb'
import type { BeatEvent } from './useAlphaTab'

export type RecorderState = 'idle' | 'requesting' | 'recording'

export interface RecordingContext {
  speed: number
  bpm: number | null
  loopStart: number | null
  loopEnd: number | null
}

interface Options {
  songId: string | null
  /** Tempo and loop at the moment recording starts, stored with the take. */
  getContext: () => RecordingContext
  /** Called when "play the tab too" is on. */
  onSyncStart: () => void
  onSyncStop: () => void
  /** Audio-synced tab beats, used to capture timing for replaying the take with the tab. */
  subscribeBeat: (listener: (beat: BeatEvent) => void) => () => void
}

/** Tab timing collected while a take is being recorded. */
interface SyncCapture {
  anchor: { atMs: number; tick: number; speed: number; round: number } | null
  context: RecordingContext | null
  lastAtMs: number
  lastDurationMs: number
  lastSpeed: number
  count: number
  speedChanges: RecordingSync['speedChanges']
  lastSyncedBeat: number | null
}

/** A gap this many beats long between two tab beats means the tab was paused or stopped mid-take. */
const GAP_FACTOR = 2.5

function toSync(capture: SyncCapture): RecordingSync | undefined {
  if (!capture.anchor || !capture.context) return undefined
  return {
    anchorMs: capture.anchor.atMs,
    tick: capture.anchor.tick,
    speed: capture.anchor.speed,
    loopStart: capture.context.loopStart,
    loopEnd: capture.context.loopEnd,
    speedChanges: capture.speedChanges,
    lastSyncedBeat: capture.lastSyncedBeat,
  }
}

interface Session {
  recorder: MediaRecorder
  stream: MediaStream
  audio: AudioContext | null
  analyser: AnalyserNode | null
}

const SYNC_KEY = 'loopster.recorder.sync'
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']

const isSupported = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

const pickMimeType = () => MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))

const newId = () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

function loadSync(): boolean {
  try {
    return localStorage.getItem(SYNC_KEY) === '1'
  } catch {
    return false
  }
}

function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Mikrofon izni verilmedi. Adres çubuğundaki izin simgesinden mikrofona izin verip tekrar dene.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Mikrofon bulunamadı. Bilgisayara bir mikrofon ya da ses kartı bağlı mı?'
  }
  if (name === 'NotReadableError') return 'Mikrofon açılamadı; başka bir uygulama kullanıyor olabilir.'
  return `Mikrofon açılamadı: ${error instanceof Error ? error.message : String(error)}`
}

/** Records the microphone per song and keeps the takes in IndexedDB. */
export function useRecorder({ songId, getContext, onSyncStart, onSyncStop, subscribeBeat }: Options) {
  const supported = isSupported()
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [syncPlayback, setSyncPlaybackState] = useState(loadSync)
  const [loaded, setLoaded] = useState<{ songId: string | null; items: Recording[] }>({ songId: null, items: [] })

  const sessionRef = useRef<Session | null>(null)
  const startedAtRef = useRef(0)
  const levelBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const latest = useRef({ getContext, onSyncStart, onSyncStop, syncPlayback, subscribeBeat })
  useEffect(() => {
    latest.current = { getContext, onSyncStart, onSyncStop, syncPlayback, subscribeBeat }
  })

  useEffect(() => {
    if (!songId) return
    let cancelled = false
    listRecordings(songId)
      .then((items) => {
        if (!cancelled) setLoaded({ songId, items })
      })
      .catch(() => {
        if (!cancelled) setError('Kayıtlar okunamadı; tarayıcı depolaması kullanılamıyor olabilir.')
      })
    return () => {
      cancelled = true
    }
  }, [songId])

  useEffect(() => {
    if (state !== 'recording') return
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAtRef.current
      setElapsedMs((prev) => (Math.floor(prev / 1000) === Math.floor(ms / 1000) ? prev : ms))
    }, 250)
    return () => window.clearInterval(id)
  }, [state])

  // Release the microphone if the app goes away mid-take.
  useEffect(
    () => () => {
      const session = sessionRef.current
      if (!session) return
      if (session.recorder.state !== 'inactive') session.recorder.stop()
      session.stream.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  const start = useCallback(async () => {
    if (sessionRef.current || !songId) return
    if (!supported) {
      setError('Bu tarayıcı ses kaydını desteklemiyor ya da sayfa güvenli bir bağlantıda (https) açılmamış.')
      return
    }
    setError(null)
    setState('requesting')

    let stream: MediaStream
    try {
      // Speech processing squashes a guitar's dynamics and cuts sustained notes, so turn it off.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch (e) {
      setState('idle')
      setError(micErrorMessage(e))
      return
    }

    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      setState('idle')
      setError('Kayıt başlatılamadı; bu tarayıcı mikrofon kaydını bu biçimde yapamıyor.')
      return
    }
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    // Tab timing for playing the take back with the tab. It is measured against the same audio-synced
    // beat events that drive the replay, so their delivery delay cancels out. Count-in clicks are skipped.
    let audioStartedAt = 0
    recorder.onstart = () => {
      audioStartedAt = performance.now()
    }
    const capture: SyncCapture = {
      anchor: null,
      context: null,
      lastAtMs: 0,
      lastDurationMs: 0,
      lastSpeed: 0,
      count: 0,
      speedChanges: [],
      lastSyncedBeat: null,
    }
    const unsubscribeBeat = latest.current.subscribeBeat((beat) => {
      if (beat.countIn || !audioStartedAt || capture.lastSyncedBeat !== null) return
      const atMs = performance.now() - audioStartedAt
      if (!capture.anchor) {
        capture.anchor = { atMs, tick: beat.tick, speed: beat.speed, round: beat.round }
        capture.context = latest.current.getContext()
        capture.lastSpeed = beat.speed
      } else if (atMs - capture.lastAtMs > GAP_FACTOR * capture.lastDurationMs) {
        capture.lastSyncedBeat = capture.count - 1
        return
      } else if (beat.speed !== capture.lastSpeed) {
        capture.speedChanges.push({ beat: capture.count, round: beat.round - capture.anchor.round, speed: beat.speed })
        capture.lastSpeed = beat.speed
      }
      capture.lastAtMs = atMs
      capture.lastDurationMs = beat.durationMs
      capture.count += 1
    })

    // The level meter is a nice-to-have; recording works without it.
    let audio: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    try {
      audio = new AudioContext()
      void audio.resume()
      analyser = audio.createAnalyser()
      analyser.fftSize = 1024
      audio.createMediaStreamSource(stream).connect(analyser)
    } catch {
      audio = null
      analyser = null
    }

    const startedAt = Date.now()
    const context = latest.current.getContext()
    const takeSongId = songId
    recorder.onstop = async () => {
      unsubscribeBeat()
      stream.getTracks().forEach((track) => track.stop())
      void audio?.close()
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
      if (blob.size === 0) {
        setError('Kayıt boş kaldı; mikrofonun ses aldığından emin ol.')
        return
      }
      const take: Recording = {
        id: newId(),
        songId: takeSongId,
        createdAt: startedAt,
        durationMs: Date.now() - startedAt,
        mimeType: blob.type,
        blob,
        ...context,
        sync: toSync(capture),
      }
      try {
        await addRecording(take)
        setLoaded((prev) => (prev.songId === takeSongId ? { songId: takeSongId, items: [take, ...prev.items] } : prev))
      } catch {
        setError('Kayıt tarayıcıya kaydedilemedi; depolama alanı dolmuş olabilir.')
      }
    }

    try {
      recorder.start(1000)
    } catch {
      recorder.onstop = null
      unsubscribeBeat()
      stream.getTracks().forEach((track) => track.stop())
      void audio?.close()
      setState('idle')
      setError('Kayıt başlatılamadı; mikrofon başka bir uygulama tarafından kullanılıyor ya da bağlantısı kesilmiş olabilir.')
      return
    }
    sessionRef.current = { recorder, stream, audio, analyser }
    startedAtRef.current = startedAt
    setElapsedMs(0)
    setState('recording')
    if (latest.current.syncPlayback) latest.current.onSyncStart()
  }, [songId, supported])

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    if (session.recorder.state !== 'inactive') session.recorder.stop()
    setState('idle')
    if (latest.current.syncPlayback) latest.current.onSyncStop()
  }, [])

  const toggle = useCallback(() => {
    if (sessionRef.current) stop()
    else void start()
  }, [start, stop])

  /** Current peak level 0..1, read by the meter on every animation frame. */
  const getLevel = useCallback(() => {
    const analyser = sessionRef.current?.analyser
    if (!analyser) return 0
    const buffer = (levelBufferRef.current ??= new Float32Array(analyser.fftSize))
    analyser.getFloatTimeDomainData(buffer)
    let peak = 0
    for (let i = 0; i < buffer.length; i++) peak = Math.max(peak, Math.abs(buffer[i]))
    return Math.min(1, peak)
  }, [])

  const remove = useCallback(async (recording: Recording) => {
    try {
      await deleteRecording(recording.id)
      releaseUrl(recording.blob)
      setLoaded((prev) => ({ ...prev, items: prev.items.filter((r) => r.id !== recording.id) }))
    } catch {
      setError('Kayıt silinemedi.')
    }
  }, [])

  const setSyncPlayback = useCallback((value: boolean) => {
    setSyncPlaybackState(value)
    try {
      localStorage.setItem(SYNC_KEY, value ? '1' : '0')
    } catch {
      // Not remembered; fine.
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    supported,
    state,
    elapsedMs,
    error,
    recordings: loaded.songId === songId ? loaded.items : [],
    syncPlayback,
    start,
    stop,
    toggle,
    remove,
    getLevel,
    setSyncPlayback,
    clearError,
  }
}

export type Recorder = ReturnType<typeof useRecorder>
