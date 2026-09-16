import { Fragment } from 'react'
import { useI18n } from '../i18n'
import { SHORTCUTS } from '../player/useShortcuts'
import { Button } from './ui'

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="shortcuts-title" className="font-display text-2xl font-semibold tracking-[0.12em] uppercase">
            {t.shortcuts.title}
          </h2>
          <Button onClick={onClose}>{t.common.close}</Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
          {SHORTCUTS.map((s) => (
            <Fragment key={s.id}>
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-9 rounded-md border border-line border-b-4 bg-raised px-2 py-1 text-center font-mono text-sm"
                  >
                    {k === 'space' ? t.shortcuts.space : k}
                  </kbd>
                ))}
              </dt>
              <dd>{t.shortcuts[s.id]}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  )
}
