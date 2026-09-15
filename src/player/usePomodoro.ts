import { useCallback, useEffect, useRef, useState } from 'react'

export type PomodoroPhase = 'idle' | 'work' | 'break'

export interface PomodoroSettings {
  workMin: number
  breakMin: number
}

const STORAGE_KEY = 'loopster.pomodoro'
const DEFAULTS: PomodoroSettings = { workMin: 25, breakMin: 5 }
const MINUTE = 60_000

const clampMinutes = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(180, Math.max(1, Math.round(value))) : fallback

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw) as Partial<PomodoroSettings>
    return {
      workMin: clampMinutes(saved.workMin, DEFAULTS.workMin),
      breakMin: clampMinutes(saved.breakMin, DEFAULTS.breakMin),
    }
  } catch {
    return DEFAULTS
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Separate from alphaTab's audio so the chime works even with no score loaded.
let chimeContext: AudioContext | null = null

function unlockChime() {
  try {
    chimeContext ??= new AudioContext()
    void chimeContext.resume()
  } catch {
    // No Web Audio: the timer still works, just silently.
  }
}

function chime(rising: boolean) {
  const ctx = chimeContext
  if (!ctx) return
  const notes = rising ? [660, 880] : [880, 660]
  notes.forEach((frequency, i) => {
    const t = ctx.currentTime + i * 0.35
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.85)
  })
}

/** Focus/break timer. When focus time ends it calls onWorkEnd (pause playback) and starts the break. */
export function usePomodoro({ onWorkEnd }: { onWorkEnd: () => void }) {
  const [settings, setSettingsState] = useState<PomodoroSettings>(loadSettings)
  const [phase, setPhase] = useState<PomodoroPhase>('idle')
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(() => loadSettings().workMin * MINUTE)
  const [completed, setCompleted] = useState(0)
  const endAtRef = useRef<number | null>(null)
  const onWorkEndRef = useRef(onWorkEnd)
  useEffect(() => {
    onWorkEndRef.current = onWorkEnd
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Storage unavailable (private mode): settings just are not remembered.
    }
  }, [settings])

  // Count against a wall-clock end time so throttled background timers stay accurate.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const endAt = endAtRef.current
      if (endAt === null) return
      const left = endAt - Date.now()
      if (left > 0) {
        // Only re-render when the shown second changes.
        setRemainingMs((prev) => (Math.ceil(prev / 1000) === Math.ceil(left / 1000) ? prev : left))
        return
      }
      if (phase === 'work') {
        onWorkEndRef.current()
        chime(false)
        setCompleted((n) => n + 1)
        setPhase('break')
        endAtRef.current = Date.now() + settings.breakMin * MINUTE
        setRemainingMs(settings.breakMin * MINUTE)
      } else {
        chime(true)
        endAtRef.current = null
        setRunning(false)
        setPhase('idle')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, phase, settings])

  // While idle the clock shows the full focus time, so it follows setting changes without extra state.
  const shownMs = phase === 'idle' ? settings.workMin * MINUTE : remainingMs

  useEffect(() => {
    document.title = running ? `${formatClock(shownMs)} · ${phase === 'break' ? 'Mola' : 'Odak'} · Loopster` : 'Loopster'
  }, [running, shownMs, phase])

  const start = useCallback(() => {
    unlockChime()
    const ms = phase === 'idle' ? settings.workMin * MINUTE : remainingMs
    endAtRef.current = Date.now() + ms
    setRemainingMs(ms)
    if (phase === 'idle') setPhase('work')
    setRunning(true)
  }, [phase, remainingMs, settings.workMin])

  const pause = useCallback(() => {
    if (endAtRef.current !== null) setRemainingMs(Math.max(0, endAtRef.current - Date.now()))
    endAtRef.current = null
    setRunning(false)
  }, [])

  const toggle = useCallback(() => (running ? pause() : start()), [running, pause, start])

  /** Back to a fresh focus period; also used to skip a break. */
  const reset = useCallback(() => {
    endAtRef.current = null
    setRunning(false)
    setPhase('idle')
    setRemainingMs(settings.workMin * MINUTE)
  }, [settings.workMin])

  const setSettings = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettingsState((s) => ({
      workMin: clampMinutes(patch.workMin ?? s.workMin, s.workMin),
      breakMin: clampMinutes(patch.breakMin ?? s.breakMin, s.breakMin),
    }))
  }, [])

  return { settings, setSettings, phase, running, remainingMs: shownMs, completed, start, pause, toggle, reset }
}

export type Pomodoro = ReturnType<typeof usePomodoro>
