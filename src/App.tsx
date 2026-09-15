import { useEffect, useRef, useState } from 'react'
import { FileDropZone } from './components/FileDropZone'
import { PracticePanel } from './components/PracticePanel'
import { ShortcutsPanel } from './components/ShortcutsPanel'
import { Button } from './components/ui'
import { useAlphaTab, type Player } from './player/useAlphaTab'
import { useShortcuts } from './player/useShortcuts'

type Theme = 'dark' | 'light'

const transportClass =
  'inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-neutral-700 px-5 text-lg font-semibold hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 light:border-neutral-300 light:hover:bg-neutral-200'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [showHelp, setShowHelp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const player = useAlphaTab(containerRef, scrollRef)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const { info, status, error, loop } = player
  const hasScore = info !== null
  const canPlay = hasScore && player.playerReady && status === 'ready'

  useShortcuts(
    {
      playPause: player.playPause,
      stop: player.stop,
      jumpBars: player.jumpBars,
      markA: player.markA,
      markB: player.markB,
      toggleLoop: player.toggleLoop,
      toggleMetronome: player.toggleMetronome,
      changeSpeed: player.changeSpeed,
      toggleHelp: () => setShowHelp((v) => !v),
      closeHelp: () => {
        if (!showHelp) return false
        setShowHelp(false)
        return true
      },
    },
    canPlay,
  )

  const bpm = info
    ? player.isPlaying && player.currentBpm
      ? player.currentBpm
      : Math.round((info.tempo * player.speed) / 100)
    : null
  const statusMessage = statusText(player)

  return (
    <div className="flex h-svh flex-col bg-neutral-950 text-neutral-100 light:bg-neutral-50 light:text-neutral-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-3 light:border-neutral-200">
        <h1 className="text-xl font-bold tracking-tight">Loopster</h1>

        {hasScore && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{info.title || 'İsimsiz parça'}</div>
            <div className="truncate text-sm text-neutral-400 light:text-neutral-600">
              {[info.artist, `${info.barCount} ölçü`, `${Math.round(info.tempo)} BPM`].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasScore && info.tracks.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 light:text-neutral-600">Görünen parça</span>
              <select
                value={player.trackIndex}
                onChange={(e) => player.selectTrack(Number(e.target.value))}
                className="h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base light:border-neutral-300 light:bg-white"
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
          <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-sm font-medium">
            {theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="border-b border-red-900 bg-red-950 px-4 py-3 text-red-200 light:border-red-200 light:bg-red-50 light:text-red-800"
        >
          <strong>Hata:</strong> {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
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

        {/* Always rendered so the score width does not change after the first render. */}
        <aside className="max-h-[42svh] shrink-0 overflow-y-auto border-t border-neutral-800 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l light:border-neutral-200">
          <PracticePanel player={player} disabled={!hasScore} />
        </aside>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-neutral-800 px-4 py-3 light:border-neutral-200">
        <button type="button" onClick={player.playPause} disabled={!canPlay} className={`${transportClass} min-w-40`}>
          {player.isPlaying ? '❚❚ Duraklat' : '▶ Çal'}
        </button>
        <button type="button" onClick={player.stop} disabled={!canPlay} className={transportClass}>
          ■ Durdur
        </button>
        <button
          type="button"
          onClick={() => player.jumpBars(-1)}
          disabled={!canPlay}
          aria-label="Önceki ölçü"
          className={transportClass}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => player.jumpBars(1)}
          disabled={!canPlay}
          aria-label="Sonraki ölçü"
          className={transportClass}
        >
          ▶
        </button>

        <div className="flex min-w-0 flex-col px-2 leading-tight">
          {hasScore && (
            <>
              <span className="text-lg font-semibold tabular-nums">
                Ölçü {player.currentBar + 1} / {info.barCount}
              </span>
              <span className="text-sm text-neutral-400 tabular-nums light:text-neutral-600">
                {bpm} BPM · %{player.speed}
                {loop.enabled && ` · Loop ${loop.start + 1}–${loop.end + 1} · Tur ${player.round}`}
              </span>
            </>
          )}
          {statusMessage && <span className="text-sm text-neutral-400 light:text-neutral-600">{statusMessage}</span>}
        </div>

        <Button onClick={() => setShowHelp(true)} className="ml-auto h-14 px-4">
          Kısayollar
          <kbd className="rounded border border-neutral-600 px-1.5 font-mono text-sm light:border-neutral-300">?</kbd>
        </Button>
      </footer>

      {showHelp && <ShortcutsPanel onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function statusText(p: Player): string | null {
  if (p.status === 'idle') return 'Başlamak için bir dosya aç.'
  if (p.status === 'loading') return 'Dosya açılıyor…'
  if (p.status === 'rendering') return 'Nota çiziliyor…'
  if (p.status === 'error') return 'Bir sorun oluştu.'
  if (!p.playerReady) return `Ses dosyası yükleniyor… %${Math.round(p.soundFontProgress * 100)}`
  return null
}

export default App
