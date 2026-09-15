import type { ReactNode } from 'react'
import { SPEED_MAX, SPEED_MIN, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, type Player } from '../player/useAlphaTab'
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
  const { info, speed, metronome, loop, trainer, round, transpose, view } = player

  return (
    <section id="settings-shelf" aria-label="Ayarlar" className="relative z-40 border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2">
        <h2 className="font-display text-lg font-semibold tracking-[0.12em] uppercase">Ayarlar</h2>
        <Button onClick={onClose}>Kapat</Button>
      </div>

      <fieldset
        disabled={disabled}
        className="grid max-h-[40svh] min-w-0 grid-cols-1 gap-px overflow-y-auto bg-line sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      >
        {disabled && (
          <p className={`col-span-full bg-surface px-5 py-3 ${hintClass}`}>Ayarlar bir dosya açınca etkinleşir.</p>
        )}

        <Cell>
          <Section title="Tempo">
            <div className="flex items-center gap-3">
              <Readout label="Hız" className="flex-1">
                %{speed}
              </Readout>
              <Readout label="BPM" className="flex-1">
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
              aria-label="Hız yüzdesi"
              className="h-11 w-full accent-accent"
            />
            <div className="grid grid-cols-3 gap-2">
              {[50, 75, 100].map((pct) => (
                <Toggle key={pct} on={speed === pct} onClick={() => player.setSpeed(pct)}>
                  %{pct}
                </Toggle>
              ))}
            </div>
          </Section>
        </Cell>

        <Cell>
          <Section title="Metronom">
            <div className="grid grid-cols-2 gap-2">
              <Toggle on={metronome.enabled} onClick={player.toggleMetronome}>
                Metronom
              </Toggle>
              <Toggle
              on={player.countIn}
              onClick={() => player.setCountIn(!player.countIn)}
              title="Çal'a basınca bir ölçü boyunca metronom sayar"
            >
                Giriş sayımı
              </Toggle>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle
                on={metronome.sound === 'tok'}
                onClick={() => player.setMetronome({ sound: 'tok' })}
                title="Güçlü, tahta blok benzeri tık"
              >
                Tok
              </Toggle>
              <Toggle
                on={metronome.sound === 'classic'}
                onClick={() => player.setMetronome({ sound: 'classic' })}
                title="alphaTab'ın kendi tık sesi (yükseltilmiş)"
              >
                Klasik
              </Toggle>
            </div>
            <Toggle
              on={player.visualMetronome}
              onClick={() => player.setVisualMetronome(!player.visualMetronome)}
              title="Alt çubukta her vuruşta yanıp sönen ışıklar; ses kapalıyken de çalışır"
              className="w-full"
            >
              Görsel vuruş
            </Toggle>
            <label className="flex items-center gap-3">
              <span className="font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase">Ses</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(metronome.volume * 100)}
                onChange={(e) => player.setMetronome({ volume: Number(e.target.value) / 100 })}
                className="h-11 flex-1 accent-accent"
              />
              <span className="led w-10 text-right">{Math.round(metronome.volume * 100)}</span>
            </label>
          </Section>
        </Cell>

        <Cell>
          <Section title="Loop çalışması">
            <Toggle
              on={player.preRoll}
              onClick={() => player.setPreRoll(!player.preRoll)}
              title="Loop baştan başlarken bir önceki ölçüden girer"
              className="w-full"
            >
              Hazırlık ölçüsü
            </Toggle>
            <Toggle on={trainer.enabled} onClick={() => player.setTrainer({ enabled: !trainer.enabled })} className="w-full">
              Kademeli hızlanma
            </Toggle>
            <div className="flex flex-wrap items-end gap-3">
              <NumberField label="Her … turda" value={trainer.everyN} min={1} max={99} onCommit={(v) => player.setTrainer({ everyN: v })} />
              <NumberField label="Artış %" value={trainer.stepPct} min={1} max={50} onCommit={(v) => player.setTrainer({ stepPct: v })} />
              <NumberField
                label="Hedef %"
                value={trainer.targetPct}
                min={SPEED_MIN}
                max={SPEED_MAX}
                onCommit={(v) => player.setTrainer({ targetPct: v })}
              />
            </div>
            {trainer.enabled && (
              <p className={hintClass}>
                {!loop.enabled
                  ? 'Loop açıkken çalışır.'
                  : speed >= trainer.targetPct
                    ? `Tur ${round} · hedef hıza ulaşıldı.`
                    : `Tur ${round} · sonraki artışa ${trainer.everyN - (round % trainer.everyN)} tur`}
              </p>
            )}
          </Section>
        </Cell>

        <Cell>
          <Section title="Görünüm">
            <div className="grid grid-cols-2 gap-2">
              <Toggle on={!view.tabOnly} onClick={() => player.setTabOnly(false)}>
                Nota + Tab
              </Toggle>
              <Toggle on={view.tabOnly} onClick={() => player.setTabOnly(true)}>
                Sadece tab
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => player.changeZoom(-ZOOM_STEP)}
                disabled={disabled || view.zoom <= ZOOM_MIN}
                aria-label="Uzaklaştır"
                className="w-12 text-xl"
              >
                −
              </Button>
              <Readout label="Büyüklük" className="flex-1 text-center">
                %{view.zoom}
              </Readout>
              <Button
                onClick={() => player.changeZoom(ZOOM_STEP)}
                disabled={disabled || view.zoom >= ZOOM_MAX}
                aria-label="Yakınlaştır"
                className="w-12 text-xl"
              >
                +
              </Button>
            </div>
            <p className={hintClass}>Tabı olmayan partiler (davul gibi) notayla gösterilmeye devam eder.</p>
          </Section>
        </Cell>

        <Cell>
          <Section title="Parçalar">
            {info && info.tracks.length > 0 ? (
              <ul className="space-y-2">
                {info.tracks.map((track, i) => (
                  <li key={track.index} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{track.name || `Parça ${i + 1}`}</span>
                    <Toggle on={player.mix[i]?.mute ?? false} tone="red" onClick={() => player.toggleMute(i)}>
                      Sustur
                    </Toggle>
                    <Toggle on={player.mix[i]?.solo ?? false} onClick={() => player.toggleSolo(i)}>
                      Solo
                    </Toggle>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={hintClass}>Dosya açınca parçalar burada listelenir.</p>
            )}
          </Section>
        </Cell>

        <Cell>
          <Section title="Transpoze">
            <div className="flex items-center gap-2">
              <Button onClick={() => player.changeTranspose(-1)} aria-label="Yarım ses aşağı" className="w-12 text-xl">
                −
              </Button>
              <Readout label="Yarım ses" className="flex-1 text-center">
                {transpose === 0 ? '0' : `${transpose > 0 ? '+' : ''}${transpose}`}
              </Readout>
              <Button onClick={() => player.changeTranspose(1)} aria-label="Yarım ses yukarı" className="w-12 text-xl">
                +
              </Button>
            </div>
            <Button
              onClick={() => player.setTranspose(0)}
              disabled={disabled || transpose === 0}
              title="Sadece ses kayar, tab aynı kalır"
              className="w-full"
            >
              Sıfırla
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
