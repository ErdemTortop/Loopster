import { SPEED_MAX, SPEED_MIN, type Player } from '../player/useAlphaTab'
import { PauseIcon, PlayIcon, SlidersIcon, StepBackIcon, StepForwardIcon, StopIcon } from './icons'
import { LedDot, Readout } from './ui'

interface Props {
  player: Player
  canPlay: boolean
  statusMessage: string | null
  panelOpen: boolean
  onTogglePanel: () => void
}

const keyClass =
  'inline-flex items-center justify-center border border-line bg-raised text-ink transition-colors select-none hover:border-accent/60 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40'
const stepperClass =
  'w-12 bg-raised text-2xl font-semibold text-ink transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40'

/** Always-visible controls, sized for reaching over with a guitar in your lap. */
export function TransportBar({ player, canPlay, statusMessage, panelOpen, onTogglePanel }: Props) {
  const { info, loop, speed } = player
  const hasScore = info !== null
  const bpm = info
    ? player.isPlaying && player.currentBpm
      ? player.currentBpm
      : Math.round((info.tempo * speed) / 100)
    : null
  const barDigits = info ? String(info.barCount).length : 2

  return (
    <footer className="faceplate relative z-40 border-t border-line px-3 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={player.playPause}
            disabled={!canPlay}
            aria-label={player.isPlaying ? 'Duraklat' : 'Çal'}
            className="inline-flex size-16 items-center justify-center rounded-full border-2 border-accent bg-accent text-accent-ink shadow-[0_0_24px_color-mix(in_oklab,var(--color-accent)_40%,transparent)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:border-line disabled:bg-raised disabled:text-muted disabled:shadow-none"
          >
            {player.isPlaying ? <PauseIcon /> : <PlayIcon className="ml-1 size-7" />}
          </button>
          <button
            type="button"
            onClick={player.stop}
            disabled={!canPlay}
            aria-label="Durdur"
            className={`${keyClass} size-14 rounded-xl`}
          >
            <StopIcon />
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => player.jumpBars(-1)}
              disabled={!canPlay}
              aria-label="Önceki ölçü"
              className={`${keyClass} h-14 w-12 rounded-l-xl`}
            >
              <StepBackIcon />
            </button>
            <button
              type="button"
              onClick={() => player.jumpBars(1)}
              disabled={!canPlay}
              aria-label="Sonraki ölçü"
              className={`${keyClass} -ml-px h-14 w-12 rounded-r-xl`}
            >
              <StepForwardIcon />
            </button>
          </div>
        </div>

        <Readout label="Ölçü">
          {hasScore ? (
            <>
              {String(player.currentBar + 1).padStart(barDigits, '0')}
              <span className="text-base text-[#8d877c]">/{info.barCount}</span>
            </>
          ) : (
            '--'
          )}
        </Readout>

        <div className="flex h-14 items-stretch overflow-hidden rounded-xl border border-black/50 bg-display shadow-[inset_0_2px_8px_rgb(0_0_0/0.65)]">
          <button
            type="button"
            onClick={() => player.changeSpeed(-5)}
            disabled={!hasScore || speed <= SPEED_MIN}
            aria-label="Hızı yüzde 5 azalt"
            className={`${stepperClass} border-r border-line`}
          >
            −
          </button>
          <div className="flex min-w-30 flex-col justify-center px-3 text-center">
            <span className="font-display text-[0.7rem] leading-none font-semibold tracking-[0.2em] text-[#8d877c] uppercase">
              {bpm ? `Tempo · ${bpm} BPM` : 'Tempo'}
            </span>
            <span className="led mt-1 text-2xl leading-none font-semibold">%{speed}</span>
          </div>
          <button
            type="button"
            onClick={() => player.changeSpeed(5)}
            disabled={!hasScore || speed >= SPEED_MAX}
            aria-label="Hızı yüzde 5 artır"
            className={`${stepperClass} border-l border-line`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={player.toggleLoop}
          disabled={!hasScore}
          aria-pressed={loop.enabled}
          className={`${keyClass} h-14 gap-3 rounded-xl px-4 ${loop.enabled ? 'border-accent/70' : ''}`}
        >
          <LedDot on={loop.enabled} />
          <span className="flex flex-col items-start leading-tight">
            <span className="font-display text-sm font-semibold tracking-[0.18em] uppercase">Loop</span>
            <span className="font-mono text-sm text-muted tabular-nums">
              {loop.enabled ? `${loop.start + 1}–${loop.end + 1}` : 'kapalı'}
            </span>
          </span>
        </button>
        {loop.enabled && <Readout label="Tur">{player.round}</Readout>}

        <div className="ml-auto flex items-center gap-3">
          {statusMessage && <span className="text-sm text-muted">{statusMessage}</span>}
          <button
            type="button"
            onClick={onTogglePanel}
            aria-expanded={panelOpen}
            aria-controls="settings-panel"
            className={`${keyClass} h-14 gap-2 rounded-xl px-4 font-display text-base font-semibold tracking-wide uppercase ${
              panelOpen ? 'border-accent text-accent' : ''
            }`}
          >
            <SlidersIcon />
            Ayarlar
          </button>
        </div>
      </div>
    </footer>
  )
}
