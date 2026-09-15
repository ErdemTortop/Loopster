import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clamp } from '../player/useAlphaTab'

const baseClass =
  'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
const idleClass =
  'border-neutral-700 hover:bg-neutral-800 light:border-neutral-300 light:hover:bg-neutral-200'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${baseClass} ${idleClass} ${className}`} {...props} />
}

interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on: boolean
  tone?: 'amber' | 'red'
}

export function Toggle({ on, tone = 'amber', className = '', ...props }: ToggleProps) {
  const activeClass =
    tone === 'red' ? 'border-red-500 bg-red-500 text-white' : 'border-amber-500 bg-amber-500 text-neutral-950'
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`${baseClass} ${on ? activeClass : idleClass} ${className}`}
      {...props}
    />
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 p-4">
      <h2 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase light:text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}

/** Commits on blur or Enter, so typing "3" on the way to "33" does not jump the loop. */
export function NumberField({ label, value, min, max, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const parsed = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(parsed)) onCommit(clamp(Math.round(parsed), min, max))
    setDraft(null)
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-400 light:text-neutral-600">{label}</span>
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
        className="h-11 w-20 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-lg tabular-nums light:border-neutral-300 light:bg-white"
      />
    </label>
  )
}
