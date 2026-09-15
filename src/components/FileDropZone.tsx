import { useEffect, useRef, useState } from 'react'
import { SUPPORTED_EXTENSIONS } from '../player/useAlphaTab'

interface Props {
  onFile: (file: File) => void
  compact?: boolean
}

export function FileDropZone({ onFile, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Accept drops anywhere on the page, not just on the box.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) onFile(file)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFile])

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={SUPPORTED_EXTENSIONS.join(',')}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
        e.target.value = ''
      }}
    />
  )

  return (
    <>
      {input}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-amber-500/20 text-3xl font-bold text-amber-200 backdrop-blur-sm light:text-amber-800">
          Dosyayı bırak
        </div>
      )}
      {compact ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-neutral-700 px-4 py-2 font-medium hover:bg-neutral-800 light:border-neutral-300 light:hover:bg-neutral-200"
        >
          Dosya aç
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-700 px-8 py-16 text-center hover:border-amber-500 hover:bg-neutral-900 light:border-neutral-300 light:hover:bg-neutral-100"
        >
          <span className="text-2xl font-semibold">Guitar Pro dosyası aç</span>
          <span className="text-neutral-400 light:text-neutral-600">
            Tıkla ya da dosyayı buraya sürükle
          </span>
          <span className="text-sm text-neutral-500">{SUPPORTED_EXTENSIONS.join('  ')}</span>
        </button>
      )}
    </>
  )
}
