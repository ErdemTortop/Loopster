import * as alphaTab from '@coderline/alphatab'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { cancelClicks, clickTime, playClick, setClickContext, unlockClick } from './clickSound'

type Score = alphaTab.model.Score
type Track = alphaTab.model.Track

export interface ScoreInfo {
  title: string
  artist: string
  barCount: number
  tempo: number
  tracks: { index: number; name: string }[]
  /** Beats per bar (time signature numerator) for each bar. */
  timeSignatures: number[]
}

export type LoadStatus = 'idle' | 'loading' | 'rendering' | 'ready' | 'error'

/** Bar indices are zero-based; the UI shows them one-based. */
export interface LoopState {
  enabled: boolean
  start: number
  end: number
}

/** "tok": our own punchy click; "classic": alphaTab's built-in General MIDI click. */
export type MetronomeSound = 'tok' | 'classic'

export interface MetronomeState {
  enabled: boolean
  volume: number
  sound: MetronomeSound
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
  /** Multiplier on the file's own track volume; 1 keeps the mix as written. */
  volume: number
}

export const TRACK_VOLUME_MAX = 1.5

/**
 * A metronome event reaches us this long after that beat has already left alphaTab's audio graph.
 * Measured by recording alphaTab's own sample-accurate click next to the event arrivals.
 * Because the beat is already gone by then, its click cannot be placed on it any more: each event
 * instead schedules the click for the *next* beat, one beat ahead, which is what keeps the tok
 * click on the music rather than a few milliseconds behind it.
 */
const EVENT_LAG_SEC = 0.007
/** Above this error the predicted grid is abandoned and re-anchored (seek, loop jump, tempo change). */
const CLICK_RESYNC_SEC = 0.02
/** How much each event pulls the grid towards the measured time; the rest keeps the click steady. */
const CLICK_GRID_BLEND = 0.2

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
export const ZOOM_MIN = 60
export const ZOOM_MAX = 200
export const ZOOM_STEP = 10

export interface ViewState {
  tabOnly: boolean
  /** Notation size in percent. */
  zoom: number
}

/** One metronome click, delivered in sync with the audio output (also while the metronome is muted). */
export interface BeatEvent {
  /** Zero-based position within the bar. */
  index: number
  durationMs: number
  /** Song tick of the click (count-in clicks use their own timeline). */
  tick: number
  /** True for the clicks of the count-in bar. */
  countIn: boolean
  /** Tempo percentage and loop round when the click was played. */
  speed: number
  round: number
}

const base = import.meta.env.BASE_URL
const NO_LOOP: LoopState = { enabled: false, start: 0, end: 0 }

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type Staff = Track['staves'][number]

const VIEW_KEY = 'loopster.view'

function loadView(): ViewState {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as Partial<ViewState> | null
    return {
      tabOnly: saved?.tabOnly === true,
      zoom: typeof saved?.zoom === 'number' ? clamp(Math.round(saved.zoom), ZOOM_MIN, ZOOM_MAX) : 100,
    }
  } catch {
    return { tabOnly: false, zoom: 100 }
  }
}

const PRE_ROLL_KEY = 'loopster.preRoll'
/** How close to the loop's first bar the position must be for a start to count as "from the top". */
const PRE_ROLL_TOLERANCE_TICKS = 120

function loadPreRoll(): boolean {
  try {
    return localStorage.getItem(PRE_ROLL_KEY) !== '0'
  } catch {
    return true
  }
}

const METRONOME_SOUND_KEY = 'loopster.metronomeSound'
/** alphaTab's click sample is quiet, so the classic sound gets a gain boost. */
const CLASSIC_BOOST = 2
/** A count-in volume of 0 disables the count-in entirely, so the "tok" sound keeps it on but inaudible. */
const SILENT_COUNT_IN = 0.0001

function loadMetronomeSound(): MetronomeSound {
  try {
    return localStorage.getItem(METRONOME_SOUND_KEY) === 'classic' ? 'classic' : 'tok'
  } catch {
    return 'tok'
  }
}

const VISUAL_METRONOME_KEY = 'loopster.visualMetronome'

function loadVisualMetronome(): boolean {
  try {
    return localStorage.getItem(VISUAL_METRONOME_KEY) !== '0'
  } catch {
    return true
  }
}

// What the file itself asked to show, so turning "tab only" off restores it exactly.
const originalVisibility = new WeakMap<Staff, { standard: boolean; tab: boolean }>()

function applyStaffVisibility(score: Score, tabOnly: boolean) {
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      let original = originalVisibility.get(staff)
      if (!original) {
        original = { standard: staff.showStandardNotation, tab: staff.showTablature }
        originalVisibility.set(staff, original)
      }
      // Only staves that have a tablature can drop the standard notation; drums and piano keep theirs.
      if (tabOnly && staff.isStringed && !staff.isPercussion) {
        staff.showStandardNotation = false
        staff.showTablature = true
      } else {
        staff.showStandardNotation = original.standard
        staff.showTablature = original.tab
      }
    }
  }
}

function barAtTick(api: alphaTab.AlphaTabApi, trackIndex: number, tick: number): number | null {
  const result = api.tickCache?.findBeat(new Set([trackIndex]), tick)
  return result ? result.masterBar.masterBar.index : null
}

async function fingerprint(data: Uint8Array<ArrayBuffer>): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // crypto.subtle needs a secure context (https or localhost); fall back to something stable-ish.
    return `size-${data.length}`
  }
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
  const [metronome, setMetronomeState] = useState<MetronomeState>(() => ({
    enabled: false,
    volume: 0.6,
    sound: loadMetronomeSound(),
  }))
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
  const [songId, setSongId] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(loadView)
  const [visualMetronome, setVisualMetronomeState] = useState(loadVisualMetronome)
  const [preRoll, setPreRollState] = useState(loadPreRoll)
  // Beats go straight to subscribers (the beat light) instead of React state, to avoid re-rendering on every click.
  const beatListenersRef = useRef(new Set<(beat: BeatEvent) => void>())
  /** Click grid: when the next beat is due on the audio clock, and what that click should sound like. */
  const clickGridRef = useRef<{ at: number; durationSec: number; index: number } | null>(null)
  const wrapListenersRef = useRef(new Set<(round: number) => void>())
  // Metronome events still to come from the count-in bar of the current start.
  const countInLeftRef = useRef(0)
  const playingRef = useRef(false)
  // True while the playback range is temporarily widened to include the pre-roll bar.
  const preRollActiveRef = useRef(false)

  // alphaTab handlers are registered once, so they read current values from here.
  const latest = useRef({ speed, loop, trainer, trackIndex, isPlaying, view, metronome, countIn, preRoll })
  useEffect(() => {
    latest.current = { speed, loop, trainer, trackIndex, isPlaying, view, metronome, countIn, preRoll }
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
      display: { scale: latest.current.view.zoom / 100 },
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
    // Metronome ticks are reported even when the metronome is muted, timed to the audio output.
    api.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.AlphaTabMetronome]
    if (import.meta.env.DEV) Object.assign(window, { __loopsterApi: api })

    // See applyPreRoll: the widened first-pass range goes back to the real loop range when it wraps or stops.
    const restoreLoopRange = () => {
      if (!preRollActiveRef.current) return
      preRollActiveRef.current = false
      const own = ownRangeRef.current
      if (own && latest.current.loop.enabled) api.playbackRange = { ...own }
    }

    const moveToBar = (bar: number) => {
      if (bar === currentBarRef.current) return
      currentBarRef.current = bar
      setCurrentBar(bar)
    }

    const unsubscribers = [
      api.scoreLoaded.on((score: Score) => {
        // scoreLoaded fires before alphaTab's first render, so the saved view costs no extra render.
        applyStaffVisibility(score, latest.current.view.tabOnly)
        setInfo({
          title: score.title,
          artist: score.artist,
          barCount: score.masterBars.length,
          tempo: score.tempo,
          timeSignatures: score.masterBars.map((bar) => bar.timeSignatureNumerator),
          tracks: score.tracks.map((t) => ({ index: t.index, name: t.name })),
        })
        setTrackIndex(0)
        setMix(score.tracks.map(() => ({ mute: false, solo: false, volume: 1 })))
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
      api.playerReady.on(() => {
        setPlayerReady(true)
        // Play our click on alphaTab's own clock: same output device, same latency, one timeline.
        const output = (api.player as unknown as { output?: { context?: AudioContext | null } } | null)?.output
        setClickContext(output?.context ?? null)
      }),
      // Not midiLoaded: in alphaTab 1.8.4 subscribing to it recurses forever in worker mode
      // (its fire-on-register getter calls itself). midiLoad fires once the tick cache exists.
      api.midiLoad.on(() => {
        rangeDirtyRef.current = true
        setMidiEpoch((n) => n + 1)
      }),
      api.playerStateChanged.on((e) => {
        const playing = e.state === alphaTab.synth.PlayerState.Playing
        const wasPlaying = playingRef.current
        playingRef.current = playing
        setIsPlaying(playing)
        // alphaTab plays a count-in bar on every start; its clicks arrive first as metronome events.
        // Arm only on a real start: alphaTab reports "playing" again when the count-in hands over to
        // the song, and loop wraps do not change state at all.
        if (playing && !wasPlaying) {
          countInLeftRef.current = latest.current.countIn
            ? (api.score?.masterBars[currentBarRef.current]?.timeSignatureNumerator ?? 4)
            : 0
        } else if (!playing) {
          countInLeftRef.current = 0
        }
        if (!playing) {
          // Clicks are scheduled ahead of the music; without this one would sound after a pause.
          cancelClicks()
          clickGridRef.current = null
        }
        if (e.stopped) {
          roundRef.current = 0
          setRound(0)
          restoreLoopRange()
        }
      }),
      api.playerPositionChanged.on((e) => {
        const bar = barAtTick(api, latest.current.trackIndex, e.currentTick)
        if (bar !== null) moveToBar(bar)
        if (e.modifiedTempo > 0) setCurrentBpm(Math.round(e.modifiedTempo))
      }),
      // With isLooping, alphaTab fires playerFinished at the end of every loop pass.
      api.playerFinished.on(() => {
        restoreLoopRange()
        const { loop, trainer, speed } = latest.current
        if (!loop.enabled) return
        roundRef.current += 1
        setRound(roundRef.current)
        const wrappedRound = roundRef.current
        wrapListenersRef.current.forEach((listener) => listener(wrappedRound))
        if (trainer.enabled && roundRef.current % trainer.everyN === 0 && speed < trainer.targetPct) {
          setSpeedState(Math.min(trainer.targetPct, speed + trainer.stepPct))
        }
      }),
      api.midiEventsPlayed.on((e) => {
        for (const event of e.events) {
          if (event.type !== alphaTab.midi.MidiEventType.AlphaTabMetronome) continue
          const click = event as alphaTab.midi.AlphaTabMetronomeEvent
          const inCountIn = countInLeftRef.current > 0
          if (inCountIn) countInLeftRef.current -= 1
          const beat: BeatEvent = {
            index: click.metronomeNumerator,
            durationMs: click.metronomeDurationInMilliseconds,
            tick: click.tick,
            countIn: inCountIn,
            speed: latest.current.speed,
            round: roundRef.current,
          }
          const { metronome } = latest.current
          if (metronome.sound === 'tok' && (metronome.enabled || inCountIn)) {
            const now = clickTime()
            const durationSec = beat.durationMs / 1000
            if (now === null) {
              playClick(metronome.volume, beat.index === 0)
            } else {
              // When this beat was heard. The event itself always arrives a little after that.
              const heardAt = now - EVENT_LAG_SEC
              const grid = clickGridRef.current
              // Delivery jitters by a few ms, so follow the predicted grid and drift towards the
              // measured time instead of jumping to every event.
              const onGrid =
                grid !== null &&
                Math.abs(grid.at - heardAt) < CLICK_RESYNC_SEC &&
                Math.abs(grid.durationSec - durationSec) < 0.002
              if (!onGrid) {
                // First beat after a start, seek or tempo change: this one can only be late, and a
                // click scheduled from the old grid would be in the wrong place.
                cancelClicks()
                playClick(metronome.volume, beat.index === 0)
              }
              const thisBeatAt = onGrid ? grid.at + (heardAt - grid.at) * CLICK_GRID_BLEND : heardAt
              const beatsPerBar = api.score?.masterBars[currentBarRef.current]?.timeSignatureNumerator ?? 4
              const nextIndex = (beat.index + 1) % Math.max(1, beatsPerBar)
              const nextAt = thisBeatAt + durationSec
              clickGridRef.current = { at: nextAt, durationSec, index: nextIndex }
              // The click for the next beat is scheduled now, a whole beat ahead, so it lands on it.
              // With the count-in on but the metronome off, counting stops when the song starts.
              if (metronome.enabled || countInLeftRef.current > 0) {
                playClick(metronome.volume, nextIndex === 0, nextAt)
              }
            }
          }
          beatListenersRef.current.forEach((listener) => listener(beat))
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

  // "classic" is alphaTab's own click (boosted); "tok" mutes it and plays our click on its metronome events.
  useEffect(() => {
    const api = apiRef.current
    if (api) {
      api.metronomeVolume = metronome.enabled && metronome.sound === 'classic' ? metronome.volume * CLASSIC_BOOST : 0
    }
    // A tok click is already scheduled a beat ahead; turning the metronome off must silence it too.
    if (!metronome.enabled || metronome.sound !== 'tok') cancelClicks()
  }, [metronome, apiEpoch, playerReady])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    if (!countIn) api.countInVolume = 0
    else if (metronome.sound === 'classic') api.countInVolume = Math.max(metronome.volume, 0.3) * CLASSIC_BOOST
    else api.countInVolume = SILENT_COUNT_IN
  }, [countIn, metronome.volume, metronome.sound, apiEpoch, playerReady])

  useEffect(() => {
    try {
      localStorage.setItem(METRONOME_SOUND_KEY, metronome.sound)
    } catch {
      // Not remembered; fine.
    }
  }, [metronome.sound])

  useEffect(() => {
    const api = apiRef.current
    const score = api?.score
    const cache = api?.tickCache
    if (!api || !score) return

    if (!loop.enabled || !cache) {
      if (ownRangeRef.current || api.playbackRange) {
        ownRangeRef.current = null
        preRollActiveRef.current = false
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
      preRollActiveRef.current = false
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
      // changeTrackVolume replaces the channel volume alphaTab set from the file (playbackInfo.volume, 0–16),
      // so scale that level instead of overwriting it.
      api.changeTrackVolume([track], (track.playbackInfo.volume / 16) * (mix[i]?.volume ?? 1))
    })
  }, [mix, midiEpoch])

  useEffect(() => {
    const api = apiRef.current
    const score = api?.score
    if (!api || !score) return
    const pitched = score.tracks.filter((t) => !t.staves.some((s) => s.isPercussion))
    if (pitched.length > 0) api.changeTrackTranspositionPitch(pitched, transpose)
  }, [transpose, midiEpoch])

  // Re-layout when the view changes; a newly loaded score already picks it up in scoreLoaded.
  const appliedViewRef = useRef(view)
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view))
    } catch {
      // Not remembered; fine.
    }
    const api = apiRef.current
    const applied = appliedViewRef.current
    appliedViewRef.current = view
    if (!api?.score || (applied.tabOnly === view.tabOnly && applied.zoom === view.zoom)) return
    applyStaffVisibility(api.score, view.tabOnly)
    api.settings.display.scale = view.zoom / 100
    api.updateSettings()
    api.render()
  }, [view])

  const setTabOnly = useCallback((tabOnly: boolean) => setView((v) => ({ ...v, tabOnly })), [])
  const changeZoom = useCallback((delta: number) => {
    setView((v) => ({ ...v, zoom: clamp(v.zoom + delta, ZOOM_MIN, ZOOM_MAX) }))
  }, [])

  const seekToTick = useCallback((tick: number) => {
    const api = apiRef.current
    if (api) api.tickPosition = Math.max(0, tick)
  }, [])

  const barStartTick = useCallback((bar: number): number | null => {
    const api = apiRef.current
    const masterBar = api?.score?.masterBars[bar]
    return api?.tickCache && masterBar ? api.tickCache.getMasterBarStart(masterBar) : null
  }, [])

  const disableLoop = useCallback(() => setLoop((l) => (l.enabled ? { ...l, enabled: false } : l)), [])

  /** Overall tab loudness (alphaTab master volume), used to balance it against a recording. */
  const setTabVolume = useCallback((volume: number) => {
    const api = apiRef.current
    if (api) api.masterVolume = clamp(volume, 0, 1)
  }, [])

  /** Called with the new round number each time the loop wraps. */
  const subscribeWrap = useCallback((listener: (round: number) => void) => {
    const listeners = wrapListenersRef.current
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  // "Zorlandım": step the tempo back and let the speed trainer count rounds again from here.
  const struggled = useCallback(() => {
    const { trainer } = latest.current
    const step = trainer.enabled ? trainer.stepPct : 5
    setSpeedState((s) => clamp(s - step, SPEED_MIN, SPEED_MAX))
    roundRef.current = 0
    setRound(0)
  }, [])

  const setPreRoll = useCallback((enabled: boolean) => {
    setPreRollState(enabled)
    try {
      localStorage.setItem(PRE_ROLL_KEY, enabled ? '1' : '0')
    } catch {
      // Not remembered; fine.
    }
  }, [])

  const subscribeBeat = useCallback((listener: (beat: BeatEvent) => void) => {
    const listeners = beatListenersRef.current
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const setVisualMetronome = useCallback((enabled: boolean) => {
    setVisualMetronomeState(enabled)
    try {
      localStorage.setItem(VISUAL_METRONOME_KEY, enabled ? '1' : '0')
    } catch {
      // Not remembered; fine.
    }
  }, [])

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
    setSongId(null)
    setStatus('loading')
    api.stop()

    try {
      const data = new Uint8Array(await file.arrayBuffer())
      // Per-song data (notes) is keyed by file content, so a renamed copy keeps it.
      setSongId(await fingerprint(data))
      if (!api.load(data, [0])) {
        setSongId(null)
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

  // Pre-roll: a start from the loop's first bar begins one bar earlier, so you can lead into the hard part.
  // Loop wraps still return to the loop start, and resuming mid-loop is left alone.
  const applyPreRoll = useCallback(() => {
    const api = apiRef.current
    const score = api?.score
    const cache = api?.tickCache
    const { loop, preRoll } = latest.current
    if (!api || !score || !cache || !preRoll || !loop.enabled || loop.start === 0) return
    if (api.playerState === alphaTab.synth.PlayerState.Playing) return
    const own = ownRangeRef.current
    if (!own || preRollActiveRef.current) return
    if (Math.abs(api.tickPosition - own.startTick) > PRE_ROLL_TOLERANCE_TICKS) return
    // Seeking before the playback range does not work: alphaTab ends the pass one range-length after
    // wherever playback started, so it would go silent before the loop end and never wrap. Instead the
    // range is widened to include the pre-roll bar for the first pass (setting it also seeks to its start),
    // and restoreLoopRange puts the real loop range back when that pass wraps.
    preRollActiveRef.current = true
    api.playbackRange = { startTick: cache.getMasterBarStart(score.masterBars[loop.start - 1]), endTick: own.endTick }
  }, [])

  // Starting playback is a user gesture, the moment the click sound may create its audio context.
  const playPause = useCallback(() => {
    unlockClick()
    applyPreRoll()
    apiRef.current?.playPause()
  }, [applyPreRoll])
  const play = useCallback(() => {
    unlockClick()
    applyPreRoll()
    apiRef.current?.play()
  }, [applyPreRoll])
  const pause = useCallback(() => apiRef.current?.pause(), [])
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
  const setTrackVolume = useCallback((index: number, volume: number) => {
    const value = clamp(volume, 0, TRACK_VOLUME_MAX)
    setMix((m) => m.map((t, i) => (i === index ? { ...t, volume: value } : t)))
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
    songId,
    view,
    setTabOnly,
    changeZoom,
    visualMetronome,
    setVisualMetronome,
    subscribeBeat,
    preRoll,
    setPreRoll,
    struggled,
    seekToTick,
    barStartTick,
    disableLoop,
    setTabVolume,
    subscribeWrap,
    loadFile,
    selectTrack,
    playPause,
    play,
    pause,
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
    setTrackVolume,
    setTranspose,
    changeTranspose,
  }
}

export type Player = ReturnType<typeof useAlphaTab>
