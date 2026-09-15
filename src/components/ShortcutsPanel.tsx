import { Fragment } from 'react'
import { SHORTCUTS } from '../player/useShortcuts'
import { Button } from './ui'

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 light:border-neutral-300 light:bg-white"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="shortcuts-title" className="text-xl font-bold">
            Klavye kısayolları
          </h2>
          <Button onClick={onClose}>Kapat</Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
          {SHORTCUTS.map((s) => (
            <Fragment key={s.label}>
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-8 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-center font-mono text-sm light:border-neutral-300 light:bg-neutral-100"
                  >
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd>{s.label}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  )
}
