import * as alphaTab from '@coderline/alphatab'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type Score = alphaTab.model.Score
type Track = alphaTab.model.Track

export interface ScoreInfo {
  title: string
  artist: string
  barCount: number
  tempo: number
  tracks: { index: number; name: string }[]
}

export type LoadStatus = 'idle' | 'loading' | 'rendering' | 'ready' | 'error'

/** Bar indices are zero-based; the UI shows them one-based. */
export interface LoopState {
  enabled: boolean
  start: number
  end: number
}

export interface MetronomeState {
  enabled: boolean
  volume: number
}

export interface TrainerConfig {
  enabled: boolean
  everyN: number
  stepPct: number
  targetPct: number
}

export interface TrackMix {
  mute: boolean
  solo: boolean
}

/** Bar bounds relative to the alphaTab container, one entry per bar. */
export interface BarRect {
  index: number
  system: number
  x: number
  y: number
  w: number
  h: number
}

export const SUPPORTED_EXTENSIONS = ['.gp5', '.gp4', '.gp3', '.gpx', '.gp']
export const SPEED_MIN = 25
export const SPEED_MAX = 150
export const TRANSPOSE_LIMIT = 12

const base = import.meta.env.BASE_URL
const NO_LOOP: LoopState = { enabled: false, start: 0, end: 0 }

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function barAtTick(api: alphaTab.AlphaTabApi, trackIndex: number, tick: number): number | null {
  const result = api.tickCache?.findBeat(new Set([trackIndex]), tick)
  return result ? result.masterBar.masterBar.index : null
}

export function useAlphaTab(
  containerRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
) {
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const [apiEpoch, setApiEpoch] = useState(0)
  const [midiEpoch, setMidiEpoch] = useState(0)
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<ScoreInfo | null>(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerReady, setPlayerReady] = useState(false)
  const [soundFontProgress, setSoundFontProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(0)
  const [currentBpm, setCurrentBpm] = useState<number | null>(null)
  const [speed, setSpeedState] = useState(100)
  const [metronome, setMetronomeState] = useState<MetronomeState>({ enabled: false, volume: 0.6 })
  const [countIn, setCountIn] = useState(false)
  const [loop, setLoop] = useState<LoopState>(NO_LOOP)
  const [trainer, setTrainerState] = useState<TrainerConfig>({
    enabled: false,
    everyN: 4,
    stepPct: 5,
    targetPct: 100,
  })
  const [round, setRound] = useState(0)
  const [mix, setMix] = useState<TrackMix[]>([])
  const [transpose, setTransposeState] = useState(0)

  // alphaTab handlers are registered once, so they read current values from here.
  const latest = useRef({ speed, loop, trainer, trackIndex, isPlaying })
  useEffect(() => {
    latest.current = { speed, loop, trainer, trackIndex, isPlaying }
  })
  const currentBarRef = useRef(0)
  const roundRef = useRef(0)
  const ownRangeRef = useRef<{ startTick: number; endTick: number } | null>(null)
  const rangeDirtyRef = useRef(true)
  const loopSetRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    const scroll = scrollRef.current
    if (!container || !scroll) return

    const api = new alphaTab.AlphaTabApi(container, {
      core: {
        fontDirectory: `${base}font/`,
        enableLazyLoading: true,
      },
      player: {
        playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
        soundFont: `${base}soundfont/sonivox.sf2`,
        scrollElement: scroll,
        scrollMode: alphaTab.ScrollMode.Continuous,
        enableCursor: true,
        enableElementHighlighting: true,
        // Its built-in selection seeks and rewrites playbackRange on every click, which fights
        // the bar-aligned loop. Clicks and drags on the score are handled by LoopEnvelope instead.
        enableUserInteraction: false,
      },
    })
    apiRef.current = api
    setApiEpoch((n) => n + 1)
    if (import.meta.env.DEV) Object.assign(window, { __loopsterApi: api })

    const moveToBar = (bar: number) => {
      if (bar === currentBarRef.current) return
      currentBarRef.current = bar
      setCurrentBar(bar)
    }

    const unsubscribers = [
      api.scoreLoaded.on((score: Score) => {
        setInfo({
          title: score.title,
          artist: score.artist,
          barCount: score.masterBars.length,
          tempo: score.tempo,
          tracks: score.tracks.map((t) => ({ index: t.index, name: t.name })),
        })
        setTrackIndex(0)
        setMix(score.tracks.map(() => ({ mute: false, solo: false })))
        setLoop(NO_LOOP)
        loopSetRef.current = false
        roundRef.current = 0
        setRound(0)
        currentBarRef.current = 0
        setCurrentBar(0)
        setCurrentBpm(null)
        setStatus('rendering')
      }),
      api.renderStarted.on(() => setStatus((s) => (s === 'error' ? s : 'rendering'))),
      api.renderFinished.on(() => setStatus((s) => (s === 'error' ? s : 'ready'))),
      // With worker rendering, boundsLookup is only published after postRenderFinished, not renderFinished.
      api.postRenderFinished.on(() => setLayoutEpoch((n) => n + 1)),
      api.soundFontLoad.on((e) => {
        if (e.total > 0) setSoundFontProgress(e.loaded / e.total)
      }),
      api.playerReady.on(() => setPlayerReady(true)),
      // Not midiLoaded: in alphaTab 1.8.4 subscribing to it recurses forever in worker mode
      // (its fire-on-register getter calls itself). midiLoad fires once the tick cache exists.
      api.midiLoad.on(() => {
        rangeDirtyRef.current = true
        setMidiEpoch((n) => n + 1)
      }),
      api.playerStateChanged.on((e) => {
        setIsPlaying(e.state === alphaTab.synth.PlayerState.Playing)
        if (e.stopped) {
          roundRef.current = 0
          setRound(0)
        }
      }),
      api.playerPositionChanged.on((e) => {
        const bar = barAtTick(api, latest.current.trackIndex, e.currentTick)
        if (bar !== null) moveToBar(bar)
        if (e.modifiedTempo > 0) setCurrentBpm(Math.round(e.modifiedTempo))
      }),
      // With isLooping, alphaTab fires playerFinished at the end of every loop pass.
      api.playerFinished.on(() => {
        const { loop, trainer, speed } = latest.current
        if (!loop.enabled) return
        roundRef.current += 1
        setRound(roundRef.current)
        if (trainer.enabled && roundRef.current % trainer.everyN === 0 && speed < trainer.targetPct) {
          setSpeedState(Math.min(trainer.targetPct, speed + trainer.stepPct))
        }
      }),
      api.error.on((e: Error) => {
        console.error('[alphaTab]', e)
        setError(`Dosya açılamadı ya da çalınamadı. Ayrıntı: ${e.message || String(e)}`)
        setStatus('error')
      }),
    ]

    return () => {
      unsubscribers.forEach((off) => off())
      api.destroy()
      apiRef.current = null
    }
  }, [containerRef, scrollRef])

  useEffect(() => {
    const api = apiRef.current
    if (api) api.playbackSpeed = speed / 100
  }, [speed, apiEpoch, playerReady])

  useEffect(() => {
    const api = apiRef.current
    if (api) api.metronomeVolume = metronome.enabled ? metronome.volume : 0
  }, [metronome, apiEpoch, playerReady])

  useEffect(() => {
    const api = apiRef.current
    if (api) api.countInVolume = countIn ? Math.max(metronome.volume, 0.3) : 0
  }, [countIn, metronome.volume, apiEpoch, playerReady])

  useEffect(() => {
    const api = apiRef.current
    const score = api?.score
    const cache = api?.tickCache
    if (!api || !score) return

    if (!loop.enabled || !cache) {
      if (ownRangeRef.current || api.playbackRange) {
        ownRangeRef.current = null
        api.playbackRange = null
        api.isLooping = false
        api.clearPlaybackRangeHighlight()
      }
      return
    }

    // Loop on whole bars: start of bar A up to the end of bar B.
    const masterBars = score.masterBars
    const a = clamp(loop.start, 0, masterBars.length - 1)
    const b = clamp(loop.end, a, masterBars.length - 1)
    const startTick = cache.getMasterBarStart(masterBars[a])
    const endTick = cache.getMasterBar(masterBars[b]).end
    const own = ownRangeRef.current
    // Setting playbackRange makes the synth seek to the range start, so only do it when the
    // range really changed (or a new MIDI was loaded) — never as a side effect of a re-render.
    if (rangeDirtyRef.current || !own || own.startTick !== startTick || own.endTick !== endTick) {
      rangeDirtyRef.current = false
      ownRangeRef.current = { startTick, endTick }
      api.playbackRange = { startTick, endTick }
      api.isLooping = true
    }
  }, [loop, midiEpoch])


  useEffect(() => {
    const api = apiRef.current
    const score = api?.score
    if (!api || !score) return
    score.tracks.forEach((track, i) => {
      api.changeTrackMute([track], mix[i]?.mute ?? false)
      api.changeTrackSolo([track], mix[i]?.solo ?? false)
    })
  }, [mix, midiEpoch])

  useEffect(() => {
    const api = apiRef.current
    const score = api?.score
    if (!api || !score) return
    const pitched = score.tracks.filter((t) => !t.staves.some((s) => s.isPercussion))
    if (pitched.length > 0) api.changeTrackTranspositionPitch(pitched, transpose)
  }, [transpose, midiEpoch])

  const loadFile = useCallback(async (file: File) => {
    const api = apiRef.current
    if (!api) return

    const name = file.name.toLowerCase()
    if (!SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError(`"${file.name}" desteklenmeyen bir dosya türü. Desteklenenler: ${SUPPORTED_EXTENSIONS.join(', ')}`)
      setStatus('error')
      return
    }

    setError(null)
    setInfo(null)
    setStatus('loading')
    api.stop()

    try {
      const data = new Uint8Array(await file.arrayBuffer())
      if (!api.load(data, [0])) {
        setError(`"${file.name}" açılamadı. Dosya biçimi tanınmadı.`)
        setStatus('error')
      }
    } catch (e) {
      setError(`"${file.name}" okunamadı: ${e instanceof Error ? e.message : String(e)}`)
      setStatus('error')
    }
  }, [])

  const selectTrack = useCallback((index: number) => {
    const api = apiRef.current
    const track: Track | undefined = api?.score?.tracks[index]
    if (!api || !track) return
    setTrackIndex(index)
    api.renderTracks([track])
  }, [])

  const playPause = useCallback(() => apiRef.current?.playPause(), [])
  const stop = useCallback(() => apiRef.current?.stop(), [])

  const jumpBars = useCallback((delta: number) => {
    const api = apiRef.current
    const score = api?.score
    const cache = api?.tickCache
    if (!api || !score || !cache) return
    // While a loop is playing stay inside it; when paused, move freely (e.g. to pick a new B).
    const { loop, isPlaying } = latest.current
    const insideLoop = loop.enabled && isPlaying
    const min = insideLoop ? loop.start : 0
    const max = insideLoop ? loop.end : score.masterBars.length - 1
    const target = clamp(currentBarRef.current + delta, min, max)
    api.tickPosition = cache.getMasterBarStart(score.masterBars[target])
    currentBarRef.current = target
    setCurrentBar(target)
  }, [])

  const setSpeed = useCallback((pct: number) => {
    setSpeedState(clamp(Math.round(pct), SPEED_MIN, SPEED_MAX))
  }, [])
  const changeSpeed = useCallback((delta: number) => {
    setSpeedState((s) => clamp(s + delta, SPEED_MIN, SPEED_MAX))
  }, [])

  const setMetronome = useCallback((patch: Partial<MetronomeState>) => {
    setMetronomeState((m) => ({ ...m, ...patch }))
  }, [])
  const toggleMetronome = useCallback(() => {
    setMetronomeState((m) => ({ ...m, enabled: !m.enabled }))
  }, [])

  const setLoopRange = useCallback((start: number, end: number) => {
    loopSetRef.current = true
    setLoop({ enabled: true, start: Math.min(start, end), end: Math.max(start, end) })
  }, [])

  // Turning the loop on brings back the previous envelope if the cursor is inside it,
  // otherwise it opens a 4-bar envelope at the cursor.
  const toggleLoop = useCallback(() => {
    const bar = currentBarRef.current
    const lastBar = (apiRef.current?.score?.masterBars.length ?? 1) - 1
    const reuse = loopSetRef.current
    loopSetRef.current = true
    setLoop((l) => {
      if (l.enabled) return { ...l, enabled: false }
      if (reuse && bar >= l.start && bar <= l.end) return { ...l, enabled: true }
      return { enabled: true, start: bar, end: Math.min(bar + 3, lastBar) }
    })
  }, [])

  const seekToBar = useCallback((bar: number) => {
    const api = apiRef.current
    const score = api?.score
    const cache = api?.tickCache
    if (!api || !score || !cache) return
    const target = clamp(bar, 0, score.masterBars.length - 1)
    currentBarRef.current = target
    setCurrentBar(target)
    // While a loop is playing, stay in it; the bar is still selected for reference.
    const { loop, isPlaying } = latest.current
    if (loop.enabled && isPlaying && (target < loop.start || target > loop.end)) return
    api.tickPosition = cache.getMasterBarStart(score.masterBars[target])
  }, [])

  const getBarRects = useCallback((): BarRect[] => {
    const lookup = apiRef.current?.boundsLookup
    if (!lookup) return []
    const rects: BarRect[] = []
    for (const system of lookup.staffSystems) {
      for (const bar of system.bars) {
        const b = bar.realBounds
        rects.push({ index: bar.index, system: system.index, x: b.x, y: b.y, w: b.w, h: b.h })
      }
    }
    return rects
  }, [])

  const setTrainer = useCallback((patch: Partial<TrainerConfig>) => {
    setTrainerState((t) => {
      const next = { ...t, ...patch }
      return {
        enabled: next.enabled,
        everyN: clamp(Math.round(next.everyN), 1, 99),
        stepPct: clamp(Math.round(next.stepPct), 1, 50),
        targetPct: clamp(Math.round(next.targetPct), SPEED_MIN, SPEED_MAX),
      }
    })
    if (patch.enabled) {
      roundRef.current = 0
      setRound(0)
    }
  }, [])

  const toggleMute = useCallback((index: number) => {
    setMix((m) => m.map((t, i) => (i === index ? { ...t, mute: !t.mute } : t)))
  }, [])
  const toggleSolo = useCallback((index: number) => {
    setMix((m) => m.map((t, i) => (i === index ? { ...t, solo: !t.solo } : t)))
  }, [])

  const setTranspose = useCallback((semitones: number) => {
    setTransposeState(clamp(Math.round(semitones), -TRANSPOSE_LIMIT, TRANSPOSE_LIMIT))
  }, [])
  // Functional update so quick repeated taps all count.
  const changeTranspose = useCallback((delta: number) => {
    setTransposeState((t) => clamp(t + delta, -TRANSPOSE_LIMIT, TRANSPOSE_LIMIT))
  }, [])

  return {
    status,
    error,
    info,
    trackIndex,
    playerReady,
    soundFontProgress,
    isPlaying,
    currentBar,
    currentBpm,
    speed,
    metronome,
    countIn,
    loop,
    trainer,
    round,
    mix,
    transpose,
    loadFile,
    selectTrack,
    playPause,
    stop,
    jumpBars,
    setSpeed,
    changeSpeed,
    setMetronome,
    toggleMetronome,
    setCountIn,
    setLoopRange,
    toggleLoop,
    seekToBar,
    getBarRects,
    layoutEpoch,
    setTrainer,
    toggleMute,
    toggleSolo,
    setTranspose,
    changeTranspose,
  }
}

export type Player = ReturnType<typeof useAlphaTab>
