import { useEffect, useRef, useState } from 'react'
import { FileDropZone } from './components/FileDropZone'
import { KeyboardIcon, MoonIcon, SunIcon } from './components/icons'
import { LoopEnvelope } from './components/LoopEnvelope'
import { PracticePanel } from './components/PracticePanel'
import { ShortcutsPanel } from './components/ShortcutsPanel'
import { TransportBar } from './components/TransportBar'
import { Button } from './components/ui'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useAlphaTab, type Player } from './player/useAlphaTab'
import { useNotes } from './player/useNotes'
import { formatClock, usePomodoro } from './player/usePomodoro'
import { useShortcuts } from './player/useShortcuts'

type Theme = 'dark' | 'light'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [showHelp, setShowHelp] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const player = useAlphaTab(containerRef, scrollRef)
  const pomodoro = usePomodoro({ onWorkEnd: player.pause })
  const notes = useNotes(player.songId)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const { info, status, error } = player
  const hasScore = info !== null
  const canPlay = hasScore && player.playerReady && status === 'ready'

  useShortcuts(
    {
      playPause: player.playPause,
      stop: player.stop,
      jumpBars: player.jumpBars,
      toggleLoop: player.toggleLoop,
      toggleMetronome: player.toggleMetronome,
      changeSpeed: player.changeSpeed,
      togglePanel: () => setPanelOpen((v) => !v),
      toggleHelp: () => setShowHelp((v) => !v),
      closeOverlay: () => {
        if (showHelp) {
          setShowHelp(false)
          return true
        }
        if (panelOpen) {
          setPanelOpen(false)
          return true
        }
        return false
      },
    },
    canPlay,
  )

  return (
    <div className="flex h-svh flex-col bg-bg text-ink">
      <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-led shadow-[0_0_10px_var(--color-led)]" />
          <h1 className="font-display text-2xl font-semibold tracking-[0.14em] uppercase">Loopster</h1>
        </div>

        {hasScore && (
          <div className="min-w-0 flex-1 border-l border-line pl-3">
            <div className="truncate font-display text-lg leading-tight font-semibold tracking-wide">
              {info.title || 'İsimsiz parça'}
            </div>
            <div className="truncate text-xs text-muted">
              {[info.artist, `${info.barCount} ölçü`, `${Math.round(info.tempo)} BPM`].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasScore && info.tracks.length > 1 && (
            <label className="hidden items-center gap-2 md:flex">
              <span className="font-display text-xs font-semibold tracking-[0.18em] text-muted uppercase">Parça</span>
              <select
                value={player.trackIndex}
                onChange={(e) => player.selectTrack(Number(e.target.value))}
                className="h-11 max-w-48 rounded-lg border border-line bg-raised px-2 text-sm"
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
          <Button onClick={() => setShowHelp(true)} aria-label="Klavye kısayolları" title="Klavye kısayolları (?)" className="w-11 px-0">
            <KeyboardIcon />
          </Button>
          <Button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
            className="w-11 px-0"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="relative z-40 border-b border-danger/50 bg-danger/15 px-4 py-3 sm:px-5">
          <strong className="font-display tracking-wide text-danger uppercase">Hata:</strong> {error}
        </div>
      )}

      {pomodoro.phase === 'break' && (
        <div
          role="status"
          className="relative z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#2f6b47] bg-[#12301f] px-4 py-2 text-[#c9f2d6] sm:px-5"
        >
          <span className="font-display text-lg font-semibold tracking-[0.16em] uppercase">
            Mola{pomodoro.running ? '' : ' · durdu'}
          </span>
          <span className="led led-break text-2xl font-semibold">{formatClock(pomodoro.remainingMs)}</span>
          <span className="text-sm">Gitarı bırak, ellerini gevşet. Mola bitince zil çalar.</span>
          <Button onClick={pomodoro.reset} className="ml-auto">
            Molayı atla
          </Button>
        </div>
      )}

      {/* overflow-hidden clips the closed drawer so it never slides over the transport bar. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
          {!hasScore && status !== 'loading' && <WelcomeScreen onFile={player.loadFile} />}
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center gap-3 font-display text-xl tracking-[0.14em] text-muted uppercase">
              <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-led" />
              Dosya açılıyor…
            </div>
          )}
          {/* Never display:none — alphaTab renders right after scoreLoaded and skips width=0 elements. */}
          <div
            className={`score-paper mx-auto my-4 max-w-6xl rounded-md p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] sm:my-6 ${
              hasScore ? '' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
            }`}
          >
            <div className="relative">
              <div ref={containerRef} />
              {hasScore && <LoopEnvelope player={player} />}
            </div>
          </div>
        </main>

        {/* The drawer floats over the score, so opening it never changes the notation width (which would force an alphaTab re-layout). */}
        <aside
          id="settings-panel"
          aria-label="Ayarlar"
          inert={!panelOpen}
          className={`absolute inset-x-0 bottom-0 z-[1100] flex max-h-[75%] flex-col rounded-t-2xl border-t border-line bg-surface shadow-[0_-12px_40px_rgb(0_0_0/0.45)] transition-transform duration-200 ease-out lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[26rem] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-[-12px_0_40px_rgb(0_0_0/0.45)] ${
            panelOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full lg:translate-y-0'
          }`}
        >
          <PracticePanel
            player={player}
            pomodoro={pomodoro}
            notes={notes}
            disabled={!hasScore}
            onClose={() => setPanelOpen(false)}
          />
        </aside>
      </div>

      <TransportBar
        player={player}
        pomodoro={pomodoro}
        canPlay={canPlay}
        statusMessage={statusText(player)}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />

      {showHelp && <ShortcutsPanel onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function statusText(p: Player): string | null {
  if (p.status === 'idle') return null
  if (p.status === 'loading') return 'Dosya açılıyor…'
  if (p.status === 'rendering') return 'Nota çiziliyor…'
  if (p.status === 'error') return 'Bir sorun oluştu.'
  if (!p.playerReady) return `Ses yükleniyor… %${Math.round(p.soundFontProgress * 100)}`
  return null
}

export default App
