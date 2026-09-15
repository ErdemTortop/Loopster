import { useEffect, useRef, useState } from 'react'
import { SUPPORTED_EXTENSIONS } from '../player/useAlphaTab'
import { FolderIcon } from './icons'
import { Button } from './ui'

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

  const openPicker = () => inputRef.current?.click()

  return (
    <>
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
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm">
          <div className="flex h-full w-full items-center justify-center rounded-3xl border-4 border-dashed border-accent">
            <span className="font-display text-5xl font-semibold tracking-wide text-accent uppercase">Dosyayı bırak</span>
          </div>
        </div>
      )}
      {compact ? (
        <Button onClick={openPicker}>
          <FolderIcon />
          <span className="hidden sm:inline">Dosya aç</span>
        </Button>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface/85 px-6 py-12 text-center transition-colors hover:border-accent hover:bg-surface"
        >
          <FolderIcon className="size-12 text-accent" />
          <span className="font-display text-3xl font-semibold tracking-wide uppercase">Guitar Pro dosyası aç</span>
          <span className="text-muted">Tıkla ya da dosyayı sayfanın herhangi bir yerine sürükle</span>
          <span className="font-mono text-xs tracking-wider text-muted">{SUPPORTED_EXTENSIONS.join('  ')}</span>
        </button>
      )}
    </>
  )
}
