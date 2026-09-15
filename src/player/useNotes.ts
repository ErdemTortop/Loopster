import { useCallback, useEffect, useMemo, useState } from 'react'

/** A note attached to a loop range; bar indices are zero-based like LoopState. */
export interface LoopNote {
  id: string
  start: number
  end: number
  text: string
  createdAt: number
}

export interface SongNotes {
  general: string
  loopNotes: LoopNote[]
}

const EMPTY: SongNotes = { general: '', loopNotes: [] }
const keyFor = (songId: string) => `loopster.notes.${songId}`

function isLoopNote(value: unknown): value is LoopNote {
  const n = value as LoopNote
  return !!n && typeof n.id === 'string' && Number.isInteger(n.start) && Number.isInteger(n.end) && typeof n.text === 'string'
}

function loadNotes(songId: string): SongNotes {
  try {
    const raw = localStorage.getItem(keyFor(songId))
    if (!raw) return EMPTY
    const saved = JSON.parse(raw) as Partial<SongNotes>
    return {
      general: typeof saved.general === 'string' ? saved.general : '',
      loopNotes: Array.isArray(saved.loopNotes) ? saved.loopNotes.filter(isLoopNote) : [],
    }
  } catch {
    return EMPTY
  }
}

const newId = () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const byRange = (a: LoopNote, b: LoopNote) => a.start - b.start || a.end - b.end || a.createdAt - b.createdAt

/** Notes for the open song, saved to localStorage as they change. */
export function useNotes(songId: string | null) {
  // Songs edited in this session; others are read from storage.
  const [edits, setEdits] = useState<Record<string, SongNotes>>({})
  const stored = useMemo(() => (songId ? loadNotes(songId) : EMPTY), [songId])
  const notes = (songId && edits[songId]) || stored

  useEffect(() => {
    const current = songId ? edits[songId] : undefined
    if (!songId || !current) return
    try {
      if (!current.general && current.loopNotes.length === 0) localStorage.removeItem(keyFor(songId))
      else localStorage.setItem(keyFor(songId), JSON.stringify(current))
    } catch {
      // Storage full or unavailable: the notes still live for this session.
    }
  }, [edits, songId])

  const update = useCallback(
    (change: (notes: SongNotes) => SongNotes) => {
      if (!songId) return
      setEdits((prev) => ({ ...prev, [songId]: change(prev[songId] ?? loadNotes(songId)) }))
    },
    [songId],
  )

  const setGeneral = useCallback((general: string) => update((n) => ({ ...n, general })), [update])

  const addLoopNote = useCallback(
    (start: number, end: number, text: string) =>
      update((n) => ({
        ...n,
        loopNotes: [...n.loopNotes, { id: newId(), start, end, text, createdAt: Date.now() }].sort(byRange),
      })),
    [update],
  )

  const removeLoopNote = useCallback(
    (id: string) => update((n) => ({ ...n, loopNotes: n.loopNotes.filter((note) => note.id !== id) })),
    [update],
  )

  return { general: notes.general, loopNotes: notes.loopNotes, setGeneral, addLoopNote, removeLoopNote }
}

export type Notes = ReturnType<typeof useNotes>
