import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import type { Player } from '../player/useAlphaTab'
import type { Notes } from '../player/useNotes'
import { Button } from './ui'

const fieldClass =
  'rounded-lg border border-line bg-raised text-sm placeholder:text-muted focus:outline-2 focus:outline-accent disabled:opacity-50'

export function NotesSection({ player, notes }: { player: Player; notes: Notes }) {
  const { t } = useI18n()
  const { loop } = player
  const [draft, setDraft] = useState('')

  const addLoopNote = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !loop.enabled) return
    notes.addLoopNote(loop.start, loop.end, text)
    setDraft('')
  }

  return (
    <div className="space-y-3 px-5 py-4">
      <textarea
        value={notes.general}
        onChange={(e) => notes.setGeneral(e.target.value)}
        rows={4}
        aria-label={t.notes.songNote}
        placeholder={t.notes.songNotePlaceholder}
        className={`${fieldClass} w-full resize-y p-3`}
      />

      <form onSubmit={addLoopNote} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!loop.enabled}
          aria-label={t.notes.loopNote}
          placeholder={loop.enabled ? t.notes.loopNotePlaceholder(loop.start + 1, loop.end + 1) : t.notes.loopNoteDisabled}
          className={`${fieldClass} h-11 min-w-0 flex-1 px-3`}
        />
        <Button type="submit" disabled={!loop.enabled || draft.trim() === ''}>
          {t.common.add}
        </Button>
      </form>

      {notes.loopNotes.length > 0 ? (
        <ul className="space-y-2">
          {notes.loopNotes.map((note) => {
            const active = loop.enabled && loop.start === note.start && loop.end === note.end
            const range = `${note.start + 1}–${note.end + 1}`
            return (
              <li
                key={note.id}
                className={`flex items-start gap-2 rounded-lg border p-2 ${
                  active ? 'border-accent/70 bg-accent/10' : 'border-line bg-bg/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => player.setLoopRange(note.start, note.end)}
                  title={t.notes.openLoop(range)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span className="led shrink-0 rounded-md bg-display px-2 py-1 text-sm">{range}</span>
                  <span className="min-w-0 pt-1 text-sm break-words whitespace-pre-wrap">{note.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => notes.removeLoopNote(note.id)}
                  aria-label={t.notes.deleteNote(range)}
                  title={t.notes.deleteNoteTitle}
                  className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-muted transition-colors hover:text-danger"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t.notes.empty}</p>
      )}

      <p className="text-xs text-muted">{t.notes.storedHint}</p>
    </div>
  )
}
