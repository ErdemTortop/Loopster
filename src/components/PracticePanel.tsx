import { SPEED_MAX, SPEED_MIN, type Player } from '../player/useAlphaTab'
import { Button, NumberField, Section, Toggle } from './ui'

const hintClass = 'text-sm text-neutral-400 light:text-neutral-600'

export function PracticePanel({ player, disabled }: { player: Player; disabled: boolean }) {
  const { info, speed, metronome, loop, trainer, round, transpose } = player
  const barCount = info?.barCount ?? 1

  return (
    <fieldset disabled={disabled} className="min-w-0 divide-y divide-neutral-800 light:divide-neutral-200">
      {disabled && <p className={`p-4 ${hintClass}`}>Kontroller bir dosya açınca etkinleşir.</p>}

      <Section title="Tempo">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold tabular-nums">%{speed}</span>
          {info && (
            <span className={`${hintClass} tabular-nums`}>≈ {Math.round((info.tempo * speed) / 100)} BPM</span>
          )}
        </div>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={1}
          value={speed}
          onChange={(e) => player.setSpeed(Number(e.target.value))}
          aria-label="Hız yüzdesi"
          className="h-11 w-full accent-amber-500"
        />
        <div className="grid grid-cols-5 gap-2">
          <Button onClick={() => player.changeSpeed(-5)} aria-label="Hızı yüzde 5 azalt">
            −5
          </Button>
          {[50, 75, 100].map((pct) => (
            <Toggle key={pct} on={speed === pct} onClick={() => player.setSpeed(pct)}>
              %{pct}
            </Toggle>
          ))}
          <Button onClick={() => player.changeSpeed(5)} aria-label="Hızı yüzde 5 artır">
            +5
          </Button>
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
        <label className="flex items-center gap-3 text-sm">
          <span className="text-neutral-400 light:text-neutral-600">Ses</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(metronome.volume * 100)}
            onChange={(e) => player.setMetronome({ volume: Number(e.target.value) / 100 })}
            className="h-11 flex-1 accent-amber-500"
          />
          <span className="w-10 text-right tabular-nums">{Math.round(metronome.volume * 100)}</span>
        </label>
        <p className={hintClass}>Giriş sayımı, Çal'a basınca bir ölçü boyunca metronom sayar.</p>
      </Section>

      <Section title="A-B loop">
        <Toggle on={loop.enabled} onClick={player.toggleLoop} className="w-full">
          {loop.enabled ? `Loop açık · ${loop.start + 1}–${loop.end + 1}. ölçüler` : 'Loop kapalı'}
        </Toggle>
        <div className="flex items-end gap-3">
          <NumberField
            label="A (başlangıç)"
            value={loop.start + 1}
            min={1}
            max={barCount}
            onCommit={(v) => player.setLoopRange(v - 1, Math.max(v - 1, loop.end))}
          />
          <span className="pb-3 text-neutral-500">→</span>
          <NumberField
            label="B (bitiş)"
            value={loop.end + 1}
            min={1}
            max={barCount}
            onCommit={(v) => player.setLoopRange(Math.min(loop.start, v - 1), v - 1)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={player.markA}>A = {player.currentBar + 1}. ölçü</Button>
          <Button onClick={player.markB}>B = {player.currentBar + 1}. ölçü</Button>
        </div>
        <p className={hintClass}>
          Başlangıç ölçüsüne git (tıkla ya da ← →) ve A'ya bas, bitiş ölçüsüne git ve B'ye bas. Loop B ile açılır.
          Fareyle birkaç ölçüyü sürükleyerek de seçebilirsin.
        </p>
      </Section>

      <Section title="Kademeli hızlanma">
        <Toggle on={trainer.enabled} onClick={() => player.setTrainer({ enabled: !trainer.enabled })} className="w-full">
          {trainer.enabled ? 'Kademeli hızlanma açık' : 'Kademeli hızlanma kapalı'}
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
          <div className="rounded-lg bg-neutral-900 p-3 light:bg-neutral-100">
            {!loop.enabled ? (
              <p className={hintClass}>Kademeli hızlanma loop açıkken çalışır.</p>
            ) : (
              <>
                <p className="text-lg font-semibold tabular-nums">
                  Tur {round} · Hız %{speed}
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

      <Section title="Transpoze">
        <div className="flex items-center gap-2">
          <Button onClick={() => player.changeTranspose(-1)} aria-label="Yarım ses aşağı" className="w-12">
            −
          </Button>
          <span className="min-w-28 text-center text-lg font-semibold tabular-nums">
            {transpose === 0 ? 'Orijinal' : `${transpose > 0 ? '+' : ''}${transpose} yarım ses`}
          </span>
          <Button onClick={() => player.changeTranspose(1)} aria-label="Yarım ses yukarı" className="w-12">
            +
          </Button>
          <Button onClick={() => player.setTranspose(0)} disabled={disabled || transpose === 0}>
            Sıfırla
          </Button>
        </div>
        <p className={hintClass}>Sadece ses kayar, tab aynı kalır. Örneğin yarım ses düşük akort için −1.</p>
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
    </fieldset>
  )
}
