import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import {
  CLICK_OFFSET_MAX,
  SPEED_MAX,
  SPEED_MIN,
  TRACK_VOLUME_MAX,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Player,
} from '../player/useAlphaTab'
import { Button, NumberField, Readout, Section, Toggle } from './ui'

const hintClass = 'text-sm text-muted'

interface Props {
  player: Player
  disabled: boolean
  onClose: () => void
}

/**
 * Practice settings in columns above the transport. Opening it only shortens the score area;
 * the notation width stays the same, so alphaTab does not re-layout.
 */
export function SettingsShelf({ player, disabled, onClose }: Props) {
  const { t } = useI18n()
  const { info, speed, metronome, loop, trainer, round, transpose, view } = player

  return (
    <section id="settings-shelf" aria-label={t.settings.title} className="relative z-40 border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2">
        <h2 className="font-display text-lg font-semibold tracking-[0.12em] uppercase">{t.settings.title}</h2>
        <Button onClick={onClose}>{t.common.close}</Button>
      </div>

      <fieldset
        disabled={disabled}
        className="grid max-h-[40svh] min-w-0 grid-cols-1 gap-px overflow-y-auto bg-line sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      >
        {disabled && (
          <p className={`col-span-full bg-surface px-5 py-3 ${hintClass}`}>{t.settings.disabledHint}</p>
        )}

        <Cell>
          <Section title={t.settings.tempo}>
            <div className="flex items-center gap-3">
              <Readout label={t.settings.speed} className="flex-1">
                {t.common.percent(speed)}
              </Readout>
              <Readout label={t.settings.bpm} className="flex-1">
                {info ? Math.round((info.tempo * speed) / 100) : '—'}
              </Readout>
            </div>
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={1}
              value={speed}
              onChange={(e) => player.setSpeed(Number(e.target.value))}
              aria-label={t.settings.speedSlider}
              className="h-11 w-full accent-accent"
            />
            <div className="grid grid-cols-3 gap-2">
              {[50, 75, 100].map((pct) => (
                <Toggle key={pct} on={speed === pct} onClick={() => player.setSpeed(pct)}>
                  {t.common.percent(pct)}
                </Toggle>
              ))}
            </div>
          </Section>
        </Cell>

        <Cell>
          <Section title={t.settings.metronome}>
            <div className="grid grid-cols-2 gap-2">
              <Toggle on={metronome.enabled} onClick={player.toggleMetronome}>
                {t.settings.metronome}
              </Toggle>
              <Toggle
              on={player.countIn}
              onClick={() => player.setCountIn(!player.countIn)}
              title={t.settings.countInTitle}
            >
                {t.settings.countIn}
              </Toggle>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle
                on={metronome.sound === 'tok'}
                onClick={() => player.setMetronome({ sound: 'tok' })}
                title={t.settings.tokTitle}
              >
                {t.settings.tok}
              </Toggle>
              <Toggle
                on={metronome.sound === 'classic'}
                onClick={() => player.setMetronome({ sound: 'classic' })}
                title={t.settings.classicTitle}
              >
                {t.settings.classic}
              </Toggle>
            </div>
            <Toggle
              on={player.visualMetronome}
              onClick={() => player.setVisualMetronome(!player.visualMetronome)}
              title={t.settings.beatLightsTitle}
              className="w-full"
            >
              {t.settings.beatLights}
            </Toggle>
            <label className="flex items-center gap-3">
              <span className="font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                {t.settings.volume}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(metronome.volume * 100)}
                onChange={(e) => player.setMetronome({ volume: Number(e.target.value) / 100 })}
                className="h-11 min-w-0 flex-1 accent-accent"
              />
              <span className="led w-10 text-right">{Math.round(metronome.volume * 100)}</span>
            </label>
            {metronome.sound === 'tok' && (
              <label
                className="flex items-center gap-3"
                title={t.settings.offsetTitle}
              >
                <span className="font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                  {t.settings.offset}
                </span>
                <input
                  type="range"
                  min={-CLICK_OFFSET_MAX}
                  max={CLICK_OFFSET_MAX}
                  step={1}
                  value={metronome.offsetMs}
                  onChange={(e) => player.setMetronome({ offsetMs: Number(e.target.value) })}
                  onDoubleClick={() => player.setMetronome({ offsetMs: 0 })}
                  aria-label={t.settings.offsetSlider}
                  className="h-11 min-w-0 flex-1 accent-accent"
                />
                <span className="led w-14 text-right">
                  {metronome.offsetMs > 0 ? '+' : ''}
                  {metronome.offsetMs} ms
                </span>
              </label>
            )}
          </Section>
        </Cell>

        <Cell>
          <Section title={t.settings.loopPractice}>
            <Toggle
              on={player.preRoll}
              onClick={() => player.setPreRoll(!player.preRoll)}
              title={t.settings.preRollTitle}
              className="w-full"
            >
              {t.settings.preRoll}
            </Toggle>
            <Toggle on={trainer.enabled} onClick={() => player.setTrainer({ enabled: !trainer.enabled })} className="w-full">
              {t.settings.trainer}
            </Toggle>
            <div className="flex flex-wrap items-end gap-3">
              <NumberField label={t.settings.everyN} value={trainer.everyN} min={1} max={99} onCommit={(v) => player.setTrainer({ everyN: v })} />
              <NumberField label={t.settings.stepPct} value={trainer.stepPct} min={1} max={50} onCommit={(v) => player.setTrainer({ stepPct: v })} />
              <NumberField
                label={t.settings.targetPct}
                value={trainer.targetPct}
                min={SPEED_MIN}
                max={SPEED_MAX}
                onCommit={(v) => player.setTrainer({ targetPct: v })}
              />
            </div>
            {trainer.enabled && (
              <p className={hintClass}>
                {!loop.enabled
                  ? t.settings.trainerNeedsLoop
                  : speed >= trainer.targetPct
                    ? t.settings.trainerDone(round)
                    : t.settings.trainerNext(round, trainer.everyN - (round % trainer.everyN))}
              </p>
            )}
          </Section>
        </Cell>

        <Cell>
          <Section title={t.settings.view}>
            <div className="grid grid-cols-2 gap-2">
              <Toggle on={!view.tabOnly} onClick={() => player.setTabOnly(false)}>
                {t.settings.notationAndTab}
              </Toggle>
              <Toggle on={view.tabOnly} onClick={() => player.setTabOnly(true)}>
                {t.settings.tabOnly}
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => player.changeZoom(-ZOOM_STEP)}
                disabled={disabled || view.zoom <= ZOOM_MIN}
                aria-label={t.settings.zoomOut}
                className="w-12 text-xl"
              >
                −
              </Button>
              <Readout label={t.settings.size} className="flex-1 text-center">
                {t.common.percent(view.zoom)}
              </Readout>
              <Button
                onClick={() => player.changeZoom(ZOOM_STEP)}
                disabled={disabled || view.zoom >= ZOOM_MAX}
                aria-label={t.settings.zoomIn}
                className="w-12 text-xl"
              >
                +
              </Button>
            </div>
            <p className={hintClass}>{t.settings.viewHint}</p>
          </Section>
        </Cell>

        <Cell>
          <Section title={t.settings.tracks}>
            {info && info.tracks.length > 0 ? (
              <ul className="space-y-3">
                {info.tracks.map((track, i) => {
                  const name = track.name || t.common.trackN(i + 1)
                  const volume = Math.round((player.mix[i]?.volume ?? 1) * 100)
                  return (
                    <li key={track.index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate" title={name}>
                          {name}
                        </span>
                        <Toggle
                          on={player.mix[i]?.mute ?? false}
                          tone="red"
                          onClick={() => player.toggleMute(i)}
                          title={t.settings.muteTitle}
                          className="px-2 text-sm"
                        >
                          {t.settings.mute}
                        </Toggle>
                        <Toggle
                          on={player.mix[i]?.solo ?? false}
                          onClick={() => player.toggleSolo(i)}
                          title={t.settings.solo}
                          className="px-2 text-sm"
                        >
                          {t.settings.solo}
                        </Toggle>
                      </div>
                      <label className="flex items-center gap-2" title={t.settings.trackVolumeTitle}>
                        <span className="sr-only">{t.settings.trackVolume(name)}</span>
                        <input
                          type="range"
                          min={0}
                          max={TRACK_VOLUME_MAX * 100}
                          step={5}
                          value={volume}
                          onChange={(e) => player.setTrackVolume(i, Number(e.target.value) / 100)}
                          onDoubleClick={() => player.setTrackVolume(i, 1)}
                          className="h-8 min-w-0 flex-1 accent-accent"
                        />
                        <span className="led w-12 text-right text-sm">{t.common.percent(volume)}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className={hintClass}>{t.settings.noTracks}</p>
            )}
          </Section>
        </Cell>

        <Cell>
          <Section title={t.settings.transpose}>
            <div className="flex items-center gap-2">
              <Button onClick={() => player.changeTranspose(-1)} aria-label={t.settings.semitoneDown} className="w-12 text-xl">
                −
              </Button>
              <Readout label={t.settings.semitones} className="flex-1 text-center">
                {transpose === 0 ? '0' : `${transpose > 0 ? '+' : ''}${transpose}`}
              </Readout>
              <Button onClick={() => player.changeTranspose(1)} aria-label={t.settings.semitoneUp} className="w-12 text-xl">
                +
              </Button>
            </div>
            <Button
              onClick={() => player.setTranspose(0)}
              disabled={disabled || transpose === 0}
              title={t.settings.transposeResetTitle}
              className="w-full"
            >
              {t.common.reset}
            </Button>
          </Section>
        </Cell>
      </fieldset>
    </section>
  )
}

function Cell({ children }: { children: ReactNode }) {
  return <div className="min-w-0 bg-surface">{children}</div>
}
