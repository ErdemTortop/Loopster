import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BarRect, Player } from '../player/useAlphaTab'

interface Range {
  start: number
  end: number
}

type DragMode = 'start' | 'end' | 'create' | 'tap'

interface Drag {
  mode: DragMode
  anchor: number
  fixed: Range | null
  x: number
  y: number
  moved: boolean
}

interface Segment {
  x: number
  y: number
  right: number
  bottom: number
  first: boolean
  last: boolean
}

const TAP_SLOP = 8

/**
 * Loop envelope drawn over the notation, Guitar Pro style.
 * Mouse: drag across bars to create a loop. Mouse or finger: drag the edge handles to resize it.
 * A click or tap on a bar moves the cursor there; a finger drag on the score still scrolls.
 */
export function LoopEnvelope({ player }: { player: Player }) {
  const { loop, layoutEpoch, getBarRects, setLoopRange, seekToBar } = player
  // Bounds only change when alphaTab re-renders, which bumps layoutEpoch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rects = useMemo(() => getBarRects(), [getBarRects, layoutEpoch])

  const overlayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const draftRef = useRef<Range | null>(null)
  const [draft, setDraft] = useState<Range | null>(null)

  const updateDraft = (next: Range | null) => {
    draftRef.current = next
    setDraft(next)
  }

  const barAt = (clientX: number, clientY: number): number | null => {
    const box = overlayRef.current?.getBoundingClientRect()
    if (!box || rects.length === 0) return null
    const x = clientX - box.left
    const y = clientY - box.top

    // Nearest system row first, then the nearest bar in that row.
    let row = rects[0].system
    let rowDistance = Infinity
    for (const r of rects) {
      const d = y < r.y ? r.y - y : y > r.y + r.h ? y - (r.y + r.h) : 0
      if (d < rowDistance) {
        rowDistance = d
        row = r.system
      }
    }
    let best: BarRect | null = null
    let bestDistance = Infinity
    for (const r of rects) {
      if (r.system !== row) continue
      const d = x < r.x ? r.x - x : x > r.x + r.w ? x - (r.x + r.w) : 0
      if (d < bestDistance) {
        bestDistance = d
        best = r
      }
    }
    return best ? best.index : null
  }

  const committed: Range | null = loop.enabled ? { start: loop.start, end: loop.end } : null
  const range = draft ?? committed

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const bar = barAt(e.clientX, e.clientY)
    if (bar === null) return
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]')?.dataset.handle
    const mode: DragMode =
      handle === 'start' || handle === 'end' ? handle : e.pointerType === 'mouse' ? 'create' : 'tap'
    dragRef.current = { mode, anchor: bar, fixed: committed, x: e.clientX, y: e.clientY, moved: false }
    // A finger on the score should keep scrolling; only handles (and the mouse) capture the pointer.
    if (mode !== 'tap') {
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < TAP_SLOP) return
    drag.moved = true
    if (drag.mode === 'tap') {
      dragRef.current = null
      return
    }
    const bar = barAt(e.clientX, e.clientY)
    if (bar === null) return
    if (drag.mode === 'create') {
      updateDraft({ start: Math.min(drag.anchor, bar), end: Math.max(drag.anchor, bar) })
    } else if (drag.fixed) {
      const { start, end } = drag.fixed
      updateDraft(drag.mode === 'start' ? { start: Math.min(bar, end), end } : { start, end: Math.max(bar, start) })
    }
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    const next = draftRef.current
    updateDraft(null)
    if (!drag.moved) {
      if (drag.mode === 'create' || drag.mode === 'tap') seekToBar(drag.anchor)
      return
    }
    // Apply only on release: changing the playback range makes the player jump to the loop start.
    if (next && (!drag.fixed || next.start !== drag.fixed.start || next.end !== drag.fixed.end)) {
      setLoopRange(next.start, next.end)
    }
  }

  const segments: Segment[] = []
  if (range) {
    const bySystem = new Map<number, Segment>()
    for (const r of rects) {
      if (r.index < range.start || r.index > range.end) continue
      const s = bySystem.get(r.system)
      if (!s) {
        bySystem.set(r.system, {
          x: r.x,
          y: r.y,
          right: r.x + r.w,
          bottom: r.y + r.h,
          first: r.index === range.start,
          last: r.index === range.end,
        })
      } else {
        s.x = Math.min(s.x, r.x)
        s.y = Math.min(s.y, r.y)
        s.right = Math.max(s.right, r.x + r.w)
        s.bottom = Math.max(s.bottom, r.y + r.h)
        s.first ||= r.index === range.start
        s.last ||= r.index === range.end
      }
    }
    segments.push(...bySystem.values())
  }

  return (
    <div
      ref={overlayRef}
      // alphaTab stacks its SVG chunks at z-index 1 and the cursor layer at 1000; stay above both.
      className="absolute inset-0 z-[1001]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null
        updateDraft(null)
      }}
    >
      {range &&
        segments.map((s) => (
          <div
            key={`${s.x}-${s.y}`}
            className={`pointer-events-none absolute rounded-md border-2 border-amber-500 bg-amber-400/15 ${
              draft ? 'border-dashed' : ''
            }`}
            style={{ left: s.x, top: s.y, width: s.right - s.x, height: s.bottom - s.y }}
          >
            {s.first && (
              <span className="absolute -top-3 left-4 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-neutral-950">
                Loop {range.start + 1}–{range.end + 1}
              </span>
            )}
            {s.first && <Handle side="start" />}
            {s.last && <Handle side="end" />}
          </div>
        ))}
    </div>
  )
}

function Handle({ side }: { side: 'start' | 'end' }) {
  return (
    <div
      data-handle={side}
      title={side === 'start' ? 'Loop başlangıcını sürükle' : 'Loop bitişini sürükle'}
      className={`pointer-events-auto absolute top-0 bottom-0 flex w-10 cursor-ew-resize touch-none items-center justify-center ${
        side === 'start' ? '-left-5' : '-right-5'
      }`}
    >
      <div className="pointer-events-none h-full max-h-28 w-3 rounded-full border-2 border-white bg-amber-500 shadow-md" />
    </div>
  )
}
