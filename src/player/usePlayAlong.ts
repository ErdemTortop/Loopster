import { useCallback, useEffect, useRef, useState } from 'react'
import { messages } from '../i18n'
import type { Recording } from './recordingsDb'
import { recordingsStore } from './recordingsStore'
import { clamp, type LoopState, type Player } from './useAlphaTab'

const BALANCE_KEY = 'loopster.playAlong.balance'
const NUDGE_KEY = 'loopster.playAlong.nudge'
export const NUDGE_LIMIT_MS = 300
/** Time for React to hand the replay's speed, loop and count-in settings to alphaTab before playing. */
const SETTLE_MS = 250

interface Snapshot {
  speed: number
  trainerEnabled: boolean
  countIn: boolean
  preRoll: boolean
  loop: LoopState
}

interface Session {
  takeId: string
  ctx: AudioContext
  gain: GainNode
  source: AudioBufferSourceNode | null
  unsubscribe: (() => void)[]
  timer: number
  snapshot: Snapshot
  /** True while the tab is supposed to be playing; a stop the replay did not ask for ends the replay. */
  tabRunning: boolean
}

function loadNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const value = Number(localStorage.getItem(key))
    return localStorage.getItem(key) !== null && Number.isFinite(value) ? clamp(value, min, max) : fallback
  } catch {
    return fallback
  }
}

function saveNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Not remembered; fine.
  }
}

/** balance -1 = only the recording, 0 = both full, +1 = only the tab. */
const levels = (balance: number) => ({
  recording: balance <= 0 ? 1 : 1 - balance,
  tab: balance >= 0 ? 1 : 1 + balance,
})

/**
 * Plays a take together with the tab, re-creating the tab timing captured while it was recorded:
 * same start position, loop and tempo, with the recorded tempo changes applied at the same loop wraps.
 */
export function usePlayAlong(player: Player) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [preparingId, setPreparingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalanceState] = useState(() => loadNumber(BALANCE_KEY, 0, -1, 1))
  const [nudgeMs, setNudgeState] = useState(() => loadNumber(NUDGE_KEY, 0, -NUDGE_LIMIT_MS, NUDGE_LIMIT_MS))

  const playerRef = useRef(player)
  const tuning = useRef({ balance, nudgeMs })
  useEffect(() => {
    playerRef.current = player
    tuning.current = { balance, nudgeMs }
  })
  const sessionRef = useRef<Session | null>(null)

  // Balance can be adjusted while listening.
  useEffect(() => {
    const session = sessionRef.current
    if (!session) return
    const { recording, tab } = levels(balance)
    session.gain.gain.value = recording
    playerRef.current.setTabVolume(tab)
  }, [balance])

  const stopRef = useRef<() => void>(() => {})
  // Pausing or stopping the tab by hand (space, Esc, transport) ends the replay as well.
  const { isPlaying } = player
  useEffect(() => {
    const session = sessionRef.current
    if (!isPlaying && session?.tabRunning) stopRef.current()
  }, [isPlaying])

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    session.unsubscribe.forEach((off) => off())
    window.clearTimeout(session.timer)
    try {
      session.source?.stop()
    } catch {
      // Already ended.
    }
    void session.ctx.close()

    const p = playerRef.current
    const { snapshot } = session
    session.tabRunning = false
    p.pause()
    p.setTabVolume(1)
    p.setSpeed(snapshot.speed)
    p.setTrainer({ enabled: snapshot.trainerEnabled })
    p.setCountIn(snapshot.countIn)
    p.setPreRoll(snapshot.preRoll)
    if (snapshot.loop.enabled) p.setLoopRange(snapshot.loop.start, snapshot.loop.end)
    else p.disableLoop()
    setPlayingId(null)
    setPreparingId(null)
  }, [])
  useEffect(() => {
    stopRef.current = stop
  })

  // Leaving the page mid-replay must not keep the extra audio context alive.
  useEffect(
    () => () => {
      const session = sessionRef.current
      if (session) void session.ctx.close()
    },
    [],
  )

  const start = useCallback(
    async (take: Recording) => {
      const sync = take.sync
      if (!sync) return
      stop()
      setError(null)
      setPreparingId(take.id)

      let ctx: AudioContext
      let buffer: AudioBuffer
      try {
        ctx = new AudioContext()
        const audio = await recordingsStore.blobFor(take)
        buffer = await ctx.decodeAudioData(await audio.arrayBuffer())
      } catch {
        setPreparingId(null)
        setError(messages().errors.playAlongDecode)
        return
      }

      const p = playerRef.current
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      const session: Session = {
        takeId: take.id,
        ctx,
        gain,
        source: null,
        unsubscribe: [],
        timer: 0,
        snapshot: { speed: p.speed, trainerEnabled: p.trainer.enabled, countIn: p.countIn, preRoll: p.preRoll, loop: p.loop },
        tabRunning: false,
      }
      sessionRef.current = session
      const { recording, tab } = levels(tuning.current.balance)
      gain.gain.value = recording
      p.setTabVolume(tab)

      // Re-create the tab setup of the take. The trainer and count-in stay off: the recorded tempo changes
      // are replayed instead, and the first audible beat must be the first beat of the music.
      p.stop()
      p.setTrainer({ enabled: false })
      p.setCountIn(false)
      p.setSpeed(sync.speed)
      const hasLoop = sync.loopStart !== null && sync.loopEnd !== null
      if (hasLoop) p.setLoopRange(sync.loopStart!, sync.loopEnd!)
      else p.disableLoop()
      const loopStartTick = hasLoop ? p.barStartTick(sync.loopStart!) : null
      // A first beat before the loop means the take started with the pre-roll bar.
      const withPreRoll = loopStartTick !== null && sync.tick < loopStartTick
      p.setPreRoll(withPreRoll)

      let beat = 0
      let firstRound = 0
      session.unsubscribe.push(
        p.subscribeBeat((event) => {
          if (event.countIn || sessionRef.current !== session) return
          if (beat === 0) {
            firstRound = event.round
            session.tabRunning = true
            // Start the recording at the moment its first tab beat was heard.
            const offsetSec = (sync.anchorMs - tuning.current.nudgeMs) / 1000
            const source = ctx.createBufferSource()
            source.buffer = buffer
            source.connect(gain)
            source.onended = () => {
              if (sessionRef.current === session) stop()
            }
            if (offsetSec >= 0) source.start(0, offsetSec)
            else source.start(ctx.currentTime - offsetSec, 0)
            session.source = source
            setPreparingId(null)
            setPlayingId(take.id)
          } else {
            if (!hasLoop) {
              const change = sync.speedChanges.find((c) => c.beat === beat)
              if (change) playerRef.current.setSpeed(change.speed)
            }
            // The tab was paused during the take; from here the recording plays on its own.
            if (sync.lastSyncedBeat !== null && beat > sync.lastSyncedBeat) {
              session.tabRunning = false
              playerRef.current.pause()
            }
          }
          beat += 1
        }),
      )
      if (hasLoop) {
        // Apply tempo changes at the loop wrap, exactly when the speed trainer made them.
        session.unsubscribe.push(
          p.subscribeWrap((round) => {
            if (sessionRef.current !== session) return
            const change = sync.speedChanges.filter((c) => c.round === round - firstRound).at(-1)
            if (change) playerRef.current.setSpeed(change.speed)
          }),
        )
      }

      session.timer = window.setTimeout(() => {
        if (sessionRef.current !== session) return
        const current = playerRef.current
        current.seekToTick(withPreRoll && loopStartTick !== null ? loopStartTick : sync.tick)
        current.play()
      }, SETTLE_MS)
    },
    [stop],
  )

  const toggle = useCallback(
    (take: Recording) => {
      if (sessionRef.current?.takeId === take.id) stop()
      else void start(take)
    },
    [start, stop],
  )

  const setBalance = useCallback((value: number) => {
    const next = clamp(value, -1, 1)
    setBalanceState(next)
    saveNumber(BALANCE_KEY, next)
  }, [])

  const setNudge = useCallback((value: number) => {
    const next = clamp(Math.round(value), -NUDGE_LIMIT_MS, NUDGE_LIMIT_MS)
    setNudgeState(next)
    saveNumber(NUDGE_KEY, next)
  }, [])

  return { playingId, preparingId, error, balance, nudgeMs, toggle, stop, setBalance, setNudge }
}

export type PlayAlong = ReturnType<typeof usePlayAlong>
