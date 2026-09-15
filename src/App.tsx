import { useEffect, useRef, useState } from 'react'
import { FileDropZone } from './components/FileDropZone'
import { useAlphaTab } from './player/useAlphaTab'

type Theme = 'dark' | 'light'

const buttonClass =
  'rounded-lg border border-neutral-700 px-5 py-3 text-lg font-semibold hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 light:border-neutral-300 light:hover:bg-neutral-200'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const player = useAlphaTab(containerRef, scrollRef)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const { info, status, error } = player
  const hasScore = info !== null
  const canPlay = hasScore && player.playerReady && status === 'ready'

  return (
    <div className="flex h-svh flex-col bg-neutral-950 text-neutral-100 light:bg-neutral-50 light:text-neutral-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-3 light:border-neutral-200">
        <h1 className="text-xl font-bold tracking-tight">Loopster</h1>

        {hasScore && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{info.title || 'İsimsiz parça'}</div>
            <div className="truncate text-sm text-neutral-400 light:text-neutral-600">
              {[info.artist, `${info.barCount} ölçü`, `${Math.round(info.tempo)} BPM`]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasScore && info.tracks.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 light:text-neutral-600">Parça</span>
              <select
                value={player.trackIndex}
                onChange={(e) => player.selectTrack(Number(e.target.value))}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base light:border-neutral-300 light:bg-white"
              >
                {info.tracks.map((t) => (
                  <option key={t.index} value={t.index}>
                    {t.index + 1}. {t.name || 'İsimsiz'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {hasScore && <FileDropZone onFile={player.loadFile} compact />}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 light:border-neutral-300 light:hover:bg-neutral-200"
          >
            {theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="border-b border-red-900 bg-red-950 px-4 py-3 text-red-200 light:border-red-200 light:bg-red-50 light:text-red-800">
          <strong>Hata:</strong> {error}
        </div>
      )}

      <main ref={scrollRef} className="relative flex-1 overflow-auto">
        {!hasScore && status !== 'loading' && (
          <div className="flex h-full items-center justify-center p-6">
            <FileDropZone onFile={player.loadFile} />
          </div>
        )}
        {status === 'loading' && (
          <div className="flex h-full items-center justify-center text-lg text-neutral-400">Dosya açılıyor…</div>
        )}
        {/* Never display:none — alphaTab renders right after scoreLoaded and skips width=0 elements. */}
        <div
          className={`score-paper mx-auto my-4 max-w-6xl rounded-lg p-2 ${
            hasScore ? '' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
          }`}
        >
          <div ref={containerRef} />
        </div>
      </main>

      <footer className="flex flex-wrap items-center gap-3 border-t border-neutral-800 px-4 py-3 light:border-neutral-200">
        <button type="button" onClick={player.playPause} disabled={!canPlay} className={`${buttonClass} min-w-32`}>
          {player.isPlaying ? '❚❚ Duraklat' : '▶ Çal'}
        </button>
        <button type="button" onClick={player.stop} disabled={!canPlay} className={buttonClass}>
          ■ Durdur
        </button>
        <span className="text-sm text-neutral-400 light:text-neutral-600">{statusText(player)}</span>
      </footer>
    </div>
  )
}

function statusText(p: ReturnType<typeof useAlphaTab>): string {
  if (p.status === 'idle') return 'Başlamak için bir dosya aç.'
  if (p.status === 'loading') return 'Dosya açılıyor…'
  if (p.status === 'rendering') return 'Nota çiziliyor…'
  if (p.status === 'error') return 'Bir sorun oluştu.'
  if (!p.playerReady) return `Ses dosyası yükleniyor… %${Math.round(p.soundFontProgress * 100)}`
  return p.isPlaying ? 'Çalıyor' : 'Hazır'
}

export default App
