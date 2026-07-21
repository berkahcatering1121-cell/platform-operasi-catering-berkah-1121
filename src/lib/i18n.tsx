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

export type Lang = 'id' | 'en'
const STORAGE_KEY = 'cb-lang'

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  /** Translate an Indonesian source string; falls back to the input itself. */
  t: (id: string) => string
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

  const t = useCallback((id: string) => (lang === 'en' ? EN[id] ?? id : id), [lang])

  const value = useMemo<I18nValue>(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
