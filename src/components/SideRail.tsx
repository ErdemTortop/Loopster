import type { ReactNode } from 'react'
import { Button } from './ui'

export interface RailItem {
  id: string
  label: string
  title: string
  icon: ReactNode
  active: boolean
  onClick: () => void
  /** Small live readout under the label (e.g. remaining pomodoro time). */
  badge?: ReactNode
}

type Side = 'left' | 'right'

/**
 * Narrow tool column on the left or right edge. It is always rendered with a fixed width,
 * so opening a tool never changes the notation width (which would force an alphaTab re-layout).
 */
export function SideRail({ side, items }: { side: Side; items: RailItem[] }) {
  return (
    <nav
      aria-label={side === 'left' ? 'Sol araçlar' : 'Sağ araçlar'}
      className={`relative z-[1200] flex w-16 shrink-0 flex-col items-center gap-2 border-line bg-surface py-3 ${
        side === 'left' ? 'border-r' : 'border-l'
      }`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          aria-pressed={item.active}
          title={item.title}
          className={`flex w-14 flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors select-none ${
            item.active ? 'border-accent bg-accent/10 text-accent' : 'border-transparent text-ink hover:border-line hover:bg-raised'
          }`}
        >
          {item.icon}
          <span className="font-display text-[0.68rem] leading-none font-semibold tracking-[0.1em] uppercase">
            {item.label}
          </span>
          {item.badge}
        </button>
      ))}
    </nav>
  )
}

interface DrawerProps {
  side: Side
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Panel that slides out from next to a rail, over the score. */
export function SideDrawer({ side, open, title, onClose, children }: DrawerProps) {
  const position = side === 'left' ? 'left-16 border-r' : 'right-16 border-l'
  const shadow = side === 'left' ? 'shadow-[12px_0_40px_rgb(0_0_0/0.45)]' : 'shadow-[-12px_0_40px_rgb(0_0_0/0.45)]'
  const closed = side === 'left' ? '-translate-x-full' : 'translate-x-full'

  return (
    <aside
      aria-label={title}
      inert={!open}
      className={`absolute inset-y-0 z-[1100] flex w-[min(26rem,calc(100%_-_8rem))] flex-col border-line bg-surface transition-transform duration-200 ease-out ${position} ${
        open ? `translate-x-0 ${shadow}` : closed
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="font-display text-xl font-semibold tracking-[0.12em] uppercase">{title}</h2>
        <Button onClick={onClose}>Kapat</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}
