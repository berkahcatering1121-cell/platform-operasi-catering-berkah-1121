import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { EN } from './dictionary'
import { setFormatLang } from './format'

export type Lang = 'id' | 'en'
const STORAGE_KEY = 'cb-lang'

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  /**
   * Translate an Indonesian source string. Pass `en` to give a context-specific
   * English word when the same Indonesian term means different things in
   * different places (e.g. "Keluar" = Log out vs. cash Out). Falls back to the
   * dictionary, then to the input string itself.
   */
  t: (id: string, en?: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'id') return saved
  } catch {
    /* localStorage unavailable */
  }
  return 'id'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // Keep the date/number formatter in sync before the first paint of each change.
  setFormatLang(lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    setLangState(l)
  }, [])

  const toggle = useCallback(() => setLang(lang === 'id' ? 'en' : 'id'), [lang, setLang])

  const t = useCallback(
    (id: string, en?: string) => (lang === 'en' ? en ?? EN[id] ?? id : id),
    [lang],
  )

  const value = useMemo<I18nValue>(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
