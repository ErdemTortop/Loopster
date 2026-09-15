import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clamp } from '../player/useAlphaTab'

const baseClass =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 font-display text-base font-semibold tracking-wide uppercase transition-colors select-none disabled:cursor-not-allowed disabled:opacity-40'
const idleClass = 'border-line bg-raised text-ink hover:border-accent/60 active:translate-y-px'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${baseClass} ${idleClass} ${className}`} {...props} />
}

interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on: boolean
  tone?: 'amber' | 'red'
}

/** A latching switch: lit when on, like a footswitch LED. */
export function Toggle({ on, tone = 'amber', className = '', children, ...props }: ToggleProps) {
  const activeClass =
    tone === 'red'
      ? 'border-danger bg-danger text-white'
      : 'border-accent bg-accent text-accent-ink shadow-[0_0_14px_color-mix(in_oklab,var(--color-accent)_40%,transparent)]'
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`${baseClass} ${on ? activeClass : idleClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function LedDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2.5 shrink-0 rounded-full ${on ? 'bg-led shadow-[0_0_8px_var(--color-led)]' : 'bg-line'}`}
    />
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <h3 className="font-display text-sm font-semibold tracking-[0.18em] text-muted uppercase">{title}</h3>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {children}
    </section>
  )
}

/** Dark display window with a small label and LED digits. */
export function Readout({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-14 min-w-20 flex-col justify-center rounded-xl border border-black/50 bg-display px-3 shadow-[inset_0_2px_8px_rgb(0_0_0/0.65)] ${className}`}
    >
      <span className="font-display text-[0.7rem] leading-none font-semibold tracking-[0.2em] text-[#8d877c] uppercase">
        {label}
      </span>
      <span className="led mt-1 text-2xl leading-none font-semibold">{children}</span>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}

/** Commits on blur or Enter, so typing "3" on the way to "33" does not apply early. */
export function NumberField({ label, value, min, max, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const parsed = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(parsed)) onCommit(clamp(Math.round(parsed), min, max))
    setDraft(null)
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? String(value)}
        onFocus={(e) => {
          setDraft(String(value))
          e.currentTarget.select()
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
        className="led h-11 w-20 rounded-lg border border-black/50 bg-display px-2 text-lg shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)] focus:outline-2 focus:outline-accent"
      />
    </label>
  )
}
