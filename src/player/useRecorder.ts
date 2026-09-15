import { useCallback, useEffect, useRef, useState } from 'react'
import { addRecording, deleteRecording, listRecordings, releaseUrl, type Recording } from './recordingsDb'

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
export function useRecorder({ songId, getContext, onSyncStart, onSyncStop }: Options) {
  const supported = isSupported()
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [syncPlayback, setSyncPlaybackState] = useState(loadSync)
  const [loaded, setLoaded] = useState<{ songId: string | null; items: Recording[] }>({ songId: null, items: [] })

  const sessionRef = useRef<Session | null>(null)
  const startedAtRef = useRef(0)
  const levelBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const latest = useRef({ getContext, onSyncStart, onSyncStop, syncPlayback })
  useEffect(() => {
    latest.current = { getContext, onSyncStart, onSyncStop, syncPlayback }
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
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

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
      }
      try {
        await addRecording(take)
        setLoaded((prev) => (prev.songId === takeSongId ? { songId: takeSongId, items: [take, ...prev.items] } : prev))
      } catch {
        setError('Kayıt tarayıcıya kaydedilemedi; depolama alanı dolmuş olabilir.')
      }
    }

    sessionRef.current = { recorder, stream, audio, analyser }
    startedAtRef.current = startedAt
    recorder.start(1000)
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
