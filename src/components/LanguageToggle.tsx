import { useT, type Lang } from '@/lib/i18n'

/**
 * Compact ID / EN segmented switch. Used in the sidebar footer so it's reachable
 * on both the desktop sidebar and the mobile drawer.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useT()

  const opt = (value: Lang, label: string) => {
    const active = lang === value
    return (
      <button
        type="button"
        onClick={() => setLang(value)}
        aria-pressed={active}
        className="flex-1 rounded-[7px] py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] transition-colors"
        style={
          active
            ? { background: '#C9A93B', color: '#14332A' }
            : { color: '#9FB3A6' }
        }
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className="mb-2 flex items-center gap-1 rounded-field p-1"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {opt('id', 'ID')}
      {opt('en', 'EN')}
    </div>
  )
}
