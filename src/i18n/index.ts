import { useSyncExternalStore } from 'react'
import { en } from './en'
import { tr, type Messages } from './tr'

export type Lang = 'tr' | 'en'
export type { Messages }

const LANG_KEY = 'loopster.lang'
const dictionaries: Record<Lang, Messages> = { tr, en }
const locales: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US' }

/** A saved choice wins; otherwise Turkish systems get Turkish and everyone else English. */
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'tr' || saved === 'en') return saved
  } catch {
    // No storage: fall back to the system language.
  }
  const system = typeof navigator === 'undefined' ? '' : navigator.language
  return system.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

let current: Lang = detectLang()
const listeners = new Set<() => void>()

function applyToDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = current
}
applyToDocument()

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // Not remembered; the switch still applies to this session.
  }
  applyToDocument()
  listeners.forEach((listener) => listener())
}

/** The active dictionary, for code outside React such as error messages set from hooks. */
export function messages(): Messages {
  return dictionaries[current]
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Current language and its text; components using it re-render when the language changes. */
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return { lang, t: dictionaries[lang], locale: locales[lang], setLang }
}
