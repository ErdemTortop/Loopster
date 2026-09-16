import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import type { BeatEvent } from '../player/useAlphaTab'

interface Props {
  beatsPerBar: number
  subscribe: (listener: (beat: BeatEvent) => void) => () => void
  playing: boolean
}

const MAX_DOTS = 12
const labelClass = 'font-display text-[0.7rem] leading-none font-semibold tracking-[0.2em] text-[#8d877c] uppercase'

/**
 * Visual metronome: one LED per beat that flashes on each click, brighter on the downbeat.
 * Lights are toggled directly on the DOM so a click never re-renders the app.
 */
export function BeatLight({ beatsPerBar, subscribe, playing }: Props) {
  const { t } = useI18n()
  const count = Math.min(Math.max(Math.round(beatsPerBar), 1), MAX_DOTS)
  const frameRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let timer = 0
    const clear = () => {
      dotsRef.current.forEach((dot) => dot?.removeAttribute('data-on'))
      frameRef.current?.removeAttribute('data-downbeat')
    }
    const unsubscribe = subscribe((beat) => {
      const index = beat.index % count
      dotsRef.current.forEach((dot, i) => dot?.toggleAttribute('data-on', i === index))
      frameRef.current?.toggleAttribute('data-downbeat', index === 0)
      window.clearTimeout(timer)
      // Flash, then go dark before the next click so each beat reads as a blink.
      timer = window.setTimeout(clear, Math.min(180, beat.durationMs * 0.45))
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
      clear()
    }
  }, [subscribe, count])

  return (
    <div
      ref={frameRef}
      title={t.transport.visualMetronome}
      className={`flex h-14 flex-col justify-center rounded-xl border border-black/50 bg-display px-3 shadow-[inset_0_2px_8px_rgb(0_0_0/0.65)] transition-colors duration-75 data-downbeat:border-accent ${
        playing ? '' : 'opacity-60'
      }`}
    >
      <span className={labelClass}>{t.transport.beat}</span>
      <span aria-hidden="true" className="mt-2 flex items-center gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              dotsRef.current[i] = el
            }}
            className={`rounded-full bg-black/70 ring-1 ring-white/5 transition-[background-color,box-shadow] duration-75 ${
              i === 0
                ? 'size-4 data-on:bg-[#fff1c9] data-on:shadow-[0_0_16px_4px_rgb(255_177_59/0.8)]'
                : 'size-3.5 data-on:bg-led data-on:shadow-[0_0_10px_2px_rgb(255_177_59/0.6)]'
            }`}
          />
        ))}
      </span>
    </div>
  )
}
