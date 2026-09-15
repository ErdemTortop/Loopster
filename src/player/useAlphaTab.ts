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

export const SUPPORTED_EXTENSIONS = ['.gp5', '.gp4', '.gp3', '.gpx', '.gp']

const base = import.meta.env.BASE_URL

export function useAlphaTab(
  containerRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
) {
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<ScoreInfo | null>(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerReady, setPlayerReady] = useState(false)
  const [soundFontProgress, setSoundFontProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

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
      },
    })
    apiRef.current = api

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
        setStatus('rendering')
      }),
      api.renderStarted.on(() => setStatus((s) => (s === 'error' ? s : 'rendering'))),
      api.renderFinished.on(() => setStatus((s) => (s === 'error' ? s : 'ready'))),
      api.soundFontLoad.on((e) => {
        if (e.total > 0) setSoundFontProgress(e.loaded / e.total)
      }),
      api.playerReady.on(() => setPlayerReady(true)),
      api.playerStateChanged.on((e) => {
        setIsPlaying(e.state === alphaTab.synth.PlayerState.Playing)
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

  return {
    status,
    error,
    info,
    trackIndex,
    playerReady,
    soundFontProgress,
    isPlaying,
    loadFile,
    selectTrack,
    playPause,
    stop,
  }
}
