import { useMemo, useState } from 'react'
import type { LibraryItem } from '../desktop/bridge'
import { useI18n } from '../i18n'
import type { Library } from '../player/useLibrary'
import { FolderIcon } from './icons'
import { Button } from './ui'

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Drops the extension; the list is all tab files anyway. */
function titleOf(name: string): string {
  return name.replace(/\.(gp|gp3|gp4|gp5|gpx)$/i, '')
}

const NO_ITEMS: LibraryItem[] = []

/** Case-insensitive match that honours both Turkish (İ/ı) and English (I/i) casing. */
function matches(text: string, query: string): boolean {
  return ['tr', 'en'].some((locale) => text.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))
}

export function LibrarySection({ library }: { library: Library }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const items = library.snapshot?.items ?? NO_ITEMS

  const groups = useMemo(() => {
    const needle = query.trim()
    const matching = needle ? items.filter((item) => matches(`${item.folder} ${item.name}`, needle)) : items
    const byFolder = new Map<string, LibraryItem[]>()
    for (const item of matching) {
      const list = byFolder.get(item.folder)
      if (list) list.push(item)
      else byFolder.set(item.folder, [item])
    }
    return [...byFolder.entries()]
  }, [items, query])

  if (!library.snapshot) {
    return (
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-muted">{t.library.intro}</p>
        <Button onClick={() => void library.pick()} disabled={library.busy} className="w-full">
          <FolderIcon />
          {library.busy ? t.library.reading : t.library.pickFolder}
        </Button>
        {library.error && <p className="text-sm text-danger">{library.error}</p>}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 px-5 py-4">
      <div className="space-y-2">
        <p className="truncate font-mono text-xs text-muted" title={library.snapshot.root}>
          {library.snapshot.root}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void library.refresh()} disabled={library.busy} className="flex-1">
            {library.busy ? t.library.reading : t.library.refresh}
          </Button>
          <Button onClick={() => void library.pick()} disabled={library.busy} className="flex-1">
            {t.library.changeFolder}
          </Button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.library.search}
          aria-label={t.library.searchLabel}
          className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink placeholder:text-muted focus:border-accent/60 focus:outline-none"
        />
      </div>

      {library.error && <p className="text-sm text-danger">{library.error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t.library.noFiles}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">{t.library.noMatch(query)}</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-4 overflow-auto">
          {groups.map(([folder, list]) => (
            <li key={folder || '.'}>
              {folder && (
                <p className="mb-1 font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                  {folder}
                </p>
              )}
              <ul className="space-y-1">
                {list.map((item) => {
                  const open = library.openPath === item.path
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => void library.open(item)}
                        title={item.path}
                        aria-current={open ? 'true' : undefined}
                        className={`flex min-h-11 w-full items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          open ? 'border-accent/70 bg-raised text-accent' : 'border-line bg-bg/40 hover:border-accent/50'
                        }`}
                      >
                        <span className="truncate text-base">{titleOf(item.name)}</span>
                        <span className="shrink-0 font-mono text-xs text-muted">{formatSize(item.size)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        {t.library.count(items.length)}
        {library.snapshot.truncated && t.library.truncated}
      </p>
    </div>
  )
}
