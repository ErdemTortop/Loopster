import { useI18n } from '../i18n'
import { formatClock, type Pomodoro } from '../player/usePomodoro'
import { Button, NumberField, Readout, Toggle } from './ui'

export function PomodoroSection({ pomodoro }: { pomodoro: Pomodoro }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <Readout label={pomodoro.phase === 'break' ? t.pomodoro.breakTime : t.pomodoro.focus} className="flex-1">
          <span className={pomodoro.phase === 'break' ? 'led-break' : ''}>{formatClock(pomodoro.remainingMs)}</span>
        </Readout>
        <Readout label={t.pomodoro.completed} className="w-32">
          {pomodoro.completed}
        </Readout>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Toggle on={pomodoro.running} onClick={pomodoro.toggle}>
          {pomodoro.running ? t.pomodoro.pause : pomodoro.phase === 'idle' ? t.pomodoro.start : t.pomodoro.resume}
        </Toggle>
        <Button onClick={pomodoro.reset}>{t.common.reset}</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label={t.pomodoro.focusMinutes}
          value={pomodoro.settings.workMin}
          min={1}
          max={180}
          onCommit={(v) => pomodoro.setSettings({ workMin: v })}
        />
        <NumberField
          label={t.pomodoro.breakMinutes}
          value={pomodoro.settings.breakMin}
          min={1}
          max={180}
          onCommit={(v) => pomodoro.setSettings({ breakMin: v })}
        />
      </div>
      <p className="text-sm text-muted">{t.pomodoro.hint}</p>
    </div>
  )
}
