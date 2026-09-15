import { SPEED_MAX, SPEED_MIN, type Player } from '../player/useAlphaTab'
import { Button, LedDot, NumberField, Readout, Section, Toggle } from './ui'

const hintClass = 'text-sm text-muted'

interface Props {
  player: Player
  disabled: boolean
  onClose: () => void
}

export function PracticePanel({ player, disabled, onClose }: Props) {
  const { info, speed, metronome, loop, trainer, round, transpose } = player

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="font-display text-xl font-semibold tracking-[0.12em] uppercase">Ayarlar</h2>
        <Button onClick={onClose}>Kapat</Button>
      </div>

      <fieldset disabled={disabled} className="min-h-0 min-w-0 flex-1 divide-y divide-line overflow-y-auto">
        {disabled && <p className={`px-5 py-4 ${hintClass}`}>Ayarlar bir dosya açınca etkinleşir.</p>}

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

        <Section title="Metronom">
          <div className="grid grid-cols-2 gap-2">
            <Toggle on={metronome.enabled} onClick={player.toggleMetronome}>
              Metronom
            </Toggle>
            <Toggle on={player.countIn} onClick={() => player.setCountIn(!player.countIn)}>
              Giriş sayımı
            </Toggle>
          </div>
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
          <p className={hintClass}>Giriş sayımı, Çal'a basınca bir ölçü boyunca metronom sayar.</p>
        </Section>

        <Section title="Kademeli hızlanma">
          <Toggle on={trainer.enabled} onClick={() => player.setTrainer({ enabled: !trainer.enabled })} className="w-full">
            {trainer.enabled ? 'Açık' : 'Kapalı'}
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
            <div className="rounded-lg border border-line bg-bg/60 p-3">
              {!loop.enabled ? (
                <p className={hintClass}>Kademeli hızlanma loop açıkken çalışır.</p>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold tracking-wide uppercase">
                    Tur <span className="led">{round}</span> · Hız <span className="led">%{speed}</span>
                  </p>
                  <p className={hintClass}>
                    {speed >= trainer.targetPct
                      ? 'Hedef hıza ulaşıldı, bu hızda devam ediyor.'
                      : `Sonraki artışa ${trainer.everyN - (round % trainer.everyN)} tur`}
                  </p>
                </>
              )}
            </div>
          )}
        </Section>

        <Section title="Loop">
          <Button onClick={player.toggleLoop} aria-pressed={loop.enabled} className="w-full justify-start">
            <LedDot on={loop.enabled} />
            {loop.enabled ? `Açık · ${loop.start + 1}–${loop.end + 1}. ölçüler` : 'Kapalı'}
          </Button>
          <p className={hintClass}>
            Notada ölçülerin üzerinden fareyle sürükleyerek zarf oluştur. Kenarlarındaki tutamaçları çekerek genişlet ya
            da daralt (tablette parmakla da olur). Loop'u açınca bulunduğun yerde 4 ölçülük bir zarf belirir.
          </p>
        </Section>

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
            <Button onClick={() => player.setTranspose(0)} disabled={disabled || transpose === 0}>
              Sıfırla
            </Button>
          </div>
          <p className={hintClass}>Sadece ses kayar, tab aynı kalır. Örneğin yarım ses düşük akort için −1.</p>
        </Section>
      </fieldset>
    </div>
  )
}
