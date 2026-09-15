import { useEffect, useRef } from 'react'

export interface ShortcutActions {
  playPause: () => void
  stop: () => void
  jumpBars: (delta: number) => void
  toggleLoop: () => void
  toggleMetronome: () => void
  changeSpeed: (delta: number) => void
  toggleRecording: () => void
  togglePanel: () => void
  toggleHelp: () => void
  /** Closes the shortcut list or the settings panel; returns true if something was open. */
  closeOverlay: () => boolean
}

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Boşluk'], label: 'Çal / duraklat' },
  { keys: ['Esc'], label: 'Durdur (açık bir panel ya da ayarlar varsa önce onları kapatır)' },
  { keys: ['←', '→'], label: 'Bir ölçü geri / ileri' },
  { keys: ['L'], label: 'Loop aç / kapa' },
  { keys: ['M'], label: 'Metronom aç / kapa' },
  { keys: ['−', '+'], label: 'Hızı %5 azalt / artır' },
  { keys: ['R'], label: 'Kayda başla / durdur' },
  { keys: ['P'], label: 'Alttaki ayarları aç / kapa' },
  { keys: ['?'], label: 'Kısayol listesini aç / kapa' },
]

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  // Sliders keep focus after a drag; shortcuts should still work there.
  if (target instanceof HTMLInputElement) return target.type !== 'range'
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function useShortcuts(actions: ShortcutActions, enabled: boolean) {
  const ref = useRef({ actions, enabled })
  useEffect(() => {
    ref.current = { actions, enabled }
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const { actions: a, enabled } = ref.current
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

      if (key === '?') {
        e.preventDefault()
        a.toggleHelp()
        return
      }
      if (key === 'p') {
        e.preventDefault()
        a.togglePanel()
        return
      }
      if (key === 'Escape' && a.closeOverlay()) {
        e.preventDefault()
        return
      }
      if (!enabled) return

      const handlers: Record<string, () => void> = {
        ' ': a.playPause,
        Escape: a.stop,
        ArrowLeft: () => a.jumpBars(-1),
        ArrowRight: () => a.jumpBars(1),
        l: a.toggleLoop,
        m: a.toggleMetronome,
        r: a.toggleRecording,
        '-': () => a.changeSpeed(-5),
        '+': () => a.changeSpeed(5),
        '=': () => a.changeSpeed(5),
      }
      const handler = handlers[key]
      if (!handler) return
      e.preventDefault()
      if (key === ' ') {
        if (e.repeat) return
        // Otherwise a focused button would also be "clicked" by the space key.
        if (e.target instanceof HTMLElement) e.target.blur()
      }
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
