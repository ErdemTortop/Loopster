import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDropZone } from './components/FileDropZone'
import { FolderIcon, KeyboardIcon, MicIcon, MoonIcon, NoteIcon, SunIcon, TimerIcon } from './components/icons'
import { LibrarySection } from './components/LibrarySection'
import { LoopEnvelope } from './components/LoopEnvelope'
import { NotesSection } from './components/NotesSection'
import { PomodoroSection } from './components/PomodoroSection'
import { RecordingsSection } from './components/RecordingsSection'
import { SettingsShelf } from './components/SettingsShelf'
import { ShortcutsPanel } from './components/ShortcutsPanel'
import { SideDrawer, SideRail, type RailItem } from './components/SideRail'
import { TransportBar } from './components/TransportBar'
import { Button } from './components/ui'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useAlphaTab, type Player } from './player/useAlphaTab'
import { useLibrary } from './player/useLibrary'
import { useNotes } from './player/useNotes'
import { usePlayAlong } from './player/usePlayAlong'
import { formatClock, usePomodoro } from './player/usePomodoro'
import { useRecorder } from './player/useRecorder'
import { useShortcuts } from './player/useShortcuts'

type Theme = 'dark' | 'light'
type LeftTool = 'notes' | 'library'
type RightTool = 'pomodoro' | 'recordings'

const recordingRed = '#ff8a7d'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [showHelp, setShowHelp] = useState(false)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [leftTool, setLeftTool] = useState<LeftTool | null>(null)
  const [rightTool, setRightTool] = useState<RightTool | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const player = useAlphaTab(containerRef, scrollRef)
  const recorder = useRecorder({
    songId: player.songId,
    getContext: () => ({
      speed: player.speed,
      bpm: player.info ? Math.round((player.info.tempo * player.speed) / 100) : null,
      loopStart: player.loop.enabled ? player.loop.start : null,
      loopEnd: player.loop.enabled ? player.loop.end : null,
    }),
    onSyncStart: player.play,
    onSyncStop: player.pause,
    subscribeBeat: player.subscribeBeat,
  })
  const playAlong = usePlayAlong(player)
  const pomodoro = usePomodoro({
    onWorkEnd: () => {
      playAlong.stop()
      player.pause()
      recorder.stop()
    },
  })
  const notes = useNotes(player.songId)

  const { stop: stopRecording } = recorder
  const { stop: stopPlayAlong } = playAlong
  const { loadFile } = player
  // Opening another song ends the current take, so it is saved with the song it belongs to.
  const openFile = useCallback(
    (file: File) => {
      stopPlayAlong()
      stopRecording()
      void loadFile(file)
    },
    [stopPlayAlong, stopRecording, loadFile],
  )
  // Desktop only: the folder of tab files the user practises from.
  const library = useLibrary(openFile)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const { info, status, error } = player
  const hasScore = info !== null
  const canPlay = hasScore && player.playerReady && status === 'ready'
  const recording = recorder.state === 'recording'
  const toggleLeftTool = (tool: LeftTool) => setLeftTool((current) => (current === tool ? null : tool))
  const toggleRightTool = (tool: RightTool) => setRightTool((current) => (current === tool ? null : tool))

  useShortcuts(
    {
      playPause: player.playPause,
      stop: player.stop,
      jumpBars: player.jumpBars,
      toggleLoop: player.toggleLoop,
      struggled: player.struggled,
      toggleMetronome: player.toggleMetronome,
      changeSpeed: player.changeSpeed,
      toggleRecording: recorder.toggle,
      togglePanel: () => setShelfOpen((v) => !v),
      toggleHelp: () => setShowHelp((v) => !v),
      closeOverlay: () => {
        if (showHelp) setShowHelp(false)
        else if (rightTool) setRightTool(null)
        else if (leftTool) setLeftTool(null)
        else if (shelfOpen) setShelfOpen(false)
        else return false
        return true
      },
    },
    canPlay,
  )

  const libraryItems = library.snapshot?.items.length ?? 0
  const leftItems: RailItem[] = [
    ...(library.supported
      ? [
          {
            id: 'library',
            label: 'Kütüphane',
            title: 'Egzersiz klasöründeki parçalar',
            icon: <FolderIcon className="size-6" />,
            active: leftTool === 'library',
            onClick: () => toggleLeftTool('library'),
            badge:
              libraryItems > 0 ? (
                <span className="font-mono text-[0.7rem] leading-none text-muted">{libraryItems}</span>
              ) : undefined,
          } satisfies RailItem,
        ]
      : []),
    {
      id: 'notes',
      label: 'Notlar',
      title: 'Parça ve loop notları',
      icon: <NoteIcon />,
      active: leftTool === 'notes',
      onClick: () => toggleLeftTool('notes'),
      badge:
        notes.loopNotes.length > 0 ? (
          <span className="font-mono text-[0.7rem] leading-none text-muted">{notes.loopNotes.length}</span>
        ) : undefined,
    },
  ]

  const rightItems: RailItem[] = [
    {
      id: 'pomodoro',
      label: 'Pomodoro',
      title: 'Pomodoro sayacı',
      icon: <TimerIcon />,
      active: rightTool === 'pomodoro',
      onClick: () => toggleRightTool('pomodoro'),
      badge: (
        <span
          className={`led text-[0.72rem] leading-none ${pomodoro.phase === 'break' ? 'led-break' : ''} ${
            pomodoro.running ? '' : 'opacity-60'
          }`}
        >
          {formatClock(pomodoro.remainingMs)}
        </span>
      ),
    },
    {
      id: 'recordings',
      label: 'Kayıt',
      title: 'Ses kayıtları',
      icon: <MicIcon />,
      active: rightTool === 'recordings',
      onClick: () => toggleRightTool('recordings'),
      badge: recording ? (
        <span className="led text-[0.72rem] leading-none" style={{ color: recordingRed }}>
          {formatClock(recorder.elapsedMs)}
        </span>
      ) : recorder.recordings.length > 0 ? (
        <span className="font-mono text-[0.7rem] leading-none text-muted">{recorder.recordings.length}</span>
      ) : undefined,
    },
  ]

  const noScoreHint = <p className="px-5 py-4 text-sm text-muted">Bir dosya açınca burada kullanabilirsin.</p>

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
          {hasScore && <FileDropZone onFile={openFile} compact />}
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
      {recorder.error && (
        <div
          role="alert"
          className="relative z-40 flex flex-wrap items-center gap-3 border-b border-danger/50 bg-danger/15 px-4 py-2 sm:px-5"
        >
          <span>
            <strong className="font-display tracking-wide text-danger uppercase">Kayıt:</strong> {recorder.error}
          </span>
          <Button onClick={recorder.clearError} className="ml-auto">
            Tamam
          </Button>
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

      {/* overflow-hidden clips closed drawers so they never slide over the rails or the transport. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <SideRail side="left" items={leftItems} />

        <main ref={scrollRef} className="relative min-h-0 min-w-0 flex-1 overflow-auto">
          {!hasScore && status !== 'loading' && <WelcomeScreen onFile={openFile} />}
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

        <SideRail side="right" items={rightItems} />

        <SideDrawer
          side="left"
          open={leftTool !== null}
          title={leftTool === 'library' ? 'Kütüphane' : 'Notlar'}
          onClose={() => setLeftTool(null)}
        >
          {leftTool === 'library' ? (
            <LibrarySection library={library} />
          ) : hasScore ? (
            <NotesSection player={player} notes={notes} />
          ) : (
            noScoreHint
          )}
        </SideDrawer>

        <SideDrawer
          side="right"
          open={rightTool !== null}
          title={rightTool === 'recordings' ? 'Kayıtlar' : 'Pomodoro'}
          onClose={() => setRightTool(null)}
        >
          {rightTool === 'recordings' ? (
            hasScore ? (
              <RecordingsSection recorder={recorder} playAlong={playAlong} songTitle={info?.title ?? ''} />
            ) : (
              noScoreHint
            )
          ) : (
            <PomodoroSection pomodoro={pomodoro} />
          )}
        </SideDrawer>
      </div>

      {shelfOpen && <SettingsShelf player={player} disabled={!hasScore} onClose={() => setShelfOpen(false)} />}

      <TransportBar
        player={player}
        recorder={recorder}
        canPlay={canPlay}
        statusMessage={statusText(player)}
        shelfOpen={shelfOpen}
        onToggleShelf={() => setShelfOpen((v) => !v)}
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
