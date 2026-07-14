import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MODULE_BY_KEY, type ModuleKey } from '@/lib/modules'
import { useAuth } from '@/auth/AuthProvider'

// Quick-access tabs (short labels). The rest of the modules live behind "Menu".
const TABS: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Beranda' },
  { key: 'pembelian', label: 'Pembelian' },
  { key: 'penjualan', label: 'Penjualan' },
  { key: 'pnl', label: 'P&L' },
]

// Wrap module icons so they render at a consistent tab size.
const iconWrap = '[&>svg]:h-[23px] [&>svg]:w-[23px]'

interface Props {
  onOpenMenu: () => void
}

/**
 * Mobile bottom navigation (Basho-style): fixed tab bar that hides when the
 * user scrolls down and reappears when they scroll up. The last item opens the
 * full module drawer.
 */
export default function BottomNav({ onOpenMenu }: Props) {
  const { canAccess } = useAuth()
  const [hidden, setHidden] = useState(false)

  const tabs = TABS.filter((t) => canAccess(t.key))

  // Hide on scroll-down, show on scroll-up. Small deltas are ignored so the bar
  // doesn't flicker on minor movements.
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 12) setHidden(false)
      else if (y > last + 8) setHidden(true)
      else if (y < last - 8) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-card/95 backdrop-blur transition-transform duration-300"
      style={{
        transform: hidden ? 'translateY(120%)' : 'translateY(0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className="mx-auto grid w-full max-w-content px-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => {
          const m = MODULE_BY_KEY[t.key]
          return (
            <NavLink
              key={t.key}
              to={m.path}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center gap-1 overflow-hidden whitespace-nowrap py-2 text-[10.5px] font-bold transition-colors ${
                  isActive ? 'text-brand' : 'text-ink-muted'
                }`
              }
            >
              <span className={iconWrap}>{m.icon}</span>
              {t.label}
            </NavLink>
          )
        })}

        <button
          onClick={onOpenMenu}
          className="flex min-w-0 flex-col items-center gap-1 overflow-hidden whitespace-nowrap py-2 text-[10.5px] font-bold text-ink-muted transition-colors active:text-brand"
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
      </div>
    </nav>
  )
}
