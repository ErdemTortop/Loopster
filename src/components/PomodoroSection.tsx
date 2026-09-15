import { formatClock, type Pomodoro } from '../player/usePomodoro'
import { Button, NumberField, Readout, Toggle } from './ui'

export function PomodoroSection({ pomodoro }: { pomodoro: Pomodoro }) {
  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <Readout label={pomodoro.phase === 'break' ? 'Mola' : 'Odak'} className="flex-1">
          <span className={pomodoro.phase === 'break' ? 'led-break' : ''}>{formatClock(pomodoro.remainingMs)}</span>
        </Readout>
        <Readout label="Tamamlanan" className="w-32">
          {pomodoro.completed}
        </Readout>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Toggle on={pomodoro.running} onClick={pomodoro.toggle}>
          {pomodoro.running ? 'Duraklat' : pomodoro.phase === 'idle' ? 'Başlat' : 'Devam et'}
        </Toggle>
        <Button onClick={pomodoro.reset}>Sıfırla</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label="Odak (dk)"
          value={pomodoro.settings.workMin}
          min={1}
          max={180}
          onCommit={(v) => pomodoro.setSettings({ workMin: v })}
        />
        <NumberField
          label="Mola (dk)"
          value={pomodoro.settings.breakMin}
          min={1}
          max={180}
          onCommit={(v) => pomodoro.setSettings({ breakMin: v })}
        />
      </div>
      <p className="text-sm text-muted">
        Odak süresi bitince çalma durur, zil çalar ve mola başlar. Mola bitince yeni turu sen başlatırsın.
      </p>
    </div>
  )
}
