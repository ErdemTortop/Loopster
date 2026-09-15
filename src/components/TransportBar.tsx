import { SPEED_MAX, SPEED_MIN, type Player } from '../player/useAlphaTab'
import { formatClock } from '../player/usePomodoro'
import type { Recorder } from '../player/useRecorder'
import { BeatLight } from './BeatLight'
import { LevelMeter } from './RecordingsSection'
import { PauseIcon, PlayIcon, SlidersIcon, StepBackIcon, StepForwardIcon, StopIcon } from './icons'
import { LedDot, Readout } from './ui'

interface Props {
  player: Player
  recorder: Recorder
  canPlay: boolean
  statusMessage: string | null
  shelfOpen: boolean
  onToggleShelf: () => void
}

const keyClass =
  'inline-flex items-center justify-center border border-line bg-raised text-ink transition-colors select-none hover:border-accent/60 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40'
const stepperClass =
  'w-12 bg-raised text-2xl font-semibold text-ink transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40'
const recordingRed = '#ff8a7d'

/** Always-visible controls, sized for reaching over with a guitar in your lap. */
export function TransportBar({ player, recorder, canPlay, statusMessage, shelfOpen, onToggleShelf }: Props) {
  const recording = recorder.state === 'recording'
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
          <button
            type="button"
            onClick={recorder.toggle}
            disabled={!hasScore || !recorder.supported || recorder.state === 'requesting'}
            aria-pressed={recording}
            aria-label={recording ? 'Kaydı durdur' : 'Kayda başla'}
            title="Mikrofonla kaydet (R)"
            className={`${keyClass} size-14 rounded-xl ${recording ? 'border-danger' : ''}`}
          >
            <span
              aria-hidden="true"
              className={`size-5 bg-danger transition-all ${
                recording ? 'rounded-sm shadow-[0_0_12px_var(--color-danger)]' : 'rounded-full'
              } ${recorder.state === 'requesting' ? 'animate-pulse' : ''}`}
            />
          </button>
        </div>

        {recording && (
          <div className="flex h-14 min-w-28 flex-col justify-center rounded-xl border border-danger/60 bg-display px-3 shadow-[inset_0_2px_8px_rgb(0_0_0/0.65)]">
            <span
              className="flex items-center gap-1.5 font-display text-[0.7rem] leading-none font-semibold tracking-[0.2em] uppercase"
              style={{ color: recordingRed }}
            >
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-danger" />
              Kayıt
            </span>
            <span className="led mt-1 text-xl leading-none font-semibold" style={{ color: recordingRed }}>
              {formatClock(recorder.elapsedMs)}
            </span>
            <LevelMeter getLevel={recorder.getLevel} />
          </div>
        )}

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

        {hasScore && player.visualMetronome && (
          <BeatLight
            beatsPerBar={info.timeSignatures[player.currentBar] ?? 4}
            subscribe={player.subscribeBeat}
            playing={player.isPlaying}
          />
        )}

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
        {loop.enabled && (
          <button
            type="button"
            onClick={player.struggled}
            disabled={speed <= SPEED_MIN}
            title="Zorlandım (Z): hızı bir adım düşürür, tur sayacını sıfırlar"
            className={`${keyClass} h-14 flex-col gap-1 rounded-xl px-3 leading-none`}
          >
            <span className="font-display text-sm font-semibold tracking-[0.14em] uppercase">Zorlandım</span>
            <span className="font-mono text-xs text-muted">−%{player.trainer.enabled ? player.trainer.stepPct : 5}</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {statusMessage && <span className="text-sm text-muted">{statusMessage}</span>}
          <button
            type="button"
            onClick={onToggleShelf}
            aria-expanded={shelfOpen}
            aria-controls="settings-shelf"
            title="Ayarlar (P)"
            className={`${keyClass} h-14 gap-2 rounded-xl px-4 font-display text-base font-semibold tracking-wide uppercase ${
              shelfOpen ? 'border-accent text-accent' : ''
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
