import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MODULE_BY_KEY, NAV } from '@/lib/modules'
import { useAuth } from '@/auth/AuthProvider'

interface SidebarProps {
  onNavigate?: () => void
  immersive: boolean
  onToggleImmersive: () => void
  onOpenPanduan: () => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function Sidebar({
  onNavigate,
  immersive,
  onToggleImmersive,
  onOpenPanduan,
}: SidebarProps) {
  const { profile, canAccess, signOut } = useAuth()
  const location = useLocation()

  // Which collapsible group (if any) contains the current route.
  const activeKey = Object.values(MODULE_BY_KEY).find((m) => m.path === location.pathname)?.key
  const activeGroup = NAV.find(
    (e) => e.type === 'group' && activeKey != null && e.keys.includes(activeKey),
  )
  const activeGroupId = activeGroup && activeGroup.type === 'group' ? activeGroup.id : undefined

  // Expanded/collapsed state per group; the active group opens automatically.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeGroupId ? { [activeGroupId]: true } : {},
  )
  useEffect(() => {
    if (activeGroupId) setOpen((o) => (o[activeGroupId] ? o : { ...o, [activeGroupId]: true }))
  }, [activeGroupId])
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  // Auto-hide scrollbar: show it while scrolling, hide ~700ms after it stops.
  const navRef = useRef<HTMLElement>(null)
  const scrollTimer = useRef<number | undefined>(undefined)
  const handleScroll = () => {
    const el = navRef.current
    if (!el) return
    el.classList.add('is-scrolling')
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => el.classList.remove('is-scrolling'), 700)
  }

  return (
    <div className="flex h-full flex-col bg-brand-sidebar text-white">
      {/* Brand header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/assets/app-icon-white.png" alt="" width={34} height={34} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-extrabold leading-tight">
              Catering Berkah 1121
            </div>
            <div className="mt-[3px] text-[9.5px] font-bold tracking-[0.2em] text-[#86A092]">
              PLATFORM OPERASI
            </div>
          </div>
        </div>

        {/* Search box with ⌘K chip (visual affordance) */}
        <div
          className="mt-3 flex items-center gap-2 rounded-field px-2.5 py-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9FB3A6" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            placeholder="Cari modul…"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[#7C948A]"
          />
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-bold text-[#9FB3A6]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            ⌘K
          </span>
        </div>
      </div>

      <div className="mx-4 mb-1.5 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={handleScroll}
        className="nav-scroll flex-1 overflow-y-auto px-3 py-1.5"
      >
        {NAV.map((entry) => {
          // Direct link (Dashboard, Master Data, Manajemen Pengguna)
          if (entry.type === 'link') {
            const m = MODULE_BY_KEY[entry.key]
            if (!canAccess(m.key)) return null
            return (
              <NavLink
                key={m.key}
                to={m.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] transition-colors ${
                    isActive
                      ? 'font-extrabold text-gold-pale'
                      : 'font-semibold text-side-inactive hover:text-white/90'
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { background: 'rgba(201,169,59,0.16)' } : undefined
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px]"
                      style={{
                        background: isActive ? '#C9A93B' : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#14332A' : '#9FB3A6',
                      }}
                    >
                      {m.icon}
                    </span>
                    <span className="flex-1 truncate">{m.label}</span>
                    <span
                      className="text-[9.5px] font-extrabold tracking-wider"
                      style={{ color: isActive ? '#C9A93B' : '#5F776C' }}
                    >
                      {m.code}
                    </span>
                  </>
                )}
              </NavLink>
            )
          }

          // Collapsible category (Operasional, Finance)
          const children = entry.keys.map((k) => MODULE_BY_KEY[k]).filter((m) => canAccess(m.key))
          if (!children.length) return null
          const isOpen = !!open[entry.id]
          const hasActiveChild = !!activeKey && entry.keys.includes(activeKey)
          return (
            <div key={entry.id} className="mt-1">
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                aria-expanded={isOpen}
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] font-semibold text-side-inactive transition-colors hover:text-white/90"
              >
                <span
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px]"
                  style={{
                    background: hasActiveChild ? 'rgba(201,169,59,0.16)' : 'rgba(255,255,255,0.06)',
                    color: hasActiveChild ? '#F1E4C0' : '#9FB3A6',
                  }}
                >
                  {entry.icon}
                </span>
                <span className="flex-1 text-left">{entry.title}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  style={{ color: '#6B8578' }}
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>

              {isOpen && (
                <div className="mb-1 ml-[24px] border-l border-white/10 pl-2">
                  {children.map((m) => (
                    <NavLink
                      key={m.key}
                      to={m.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `mb-0.5 flex items-center rounded-[8px] px-2.5 py-2 text-[12.5px] transition-colors ${
                          isActive
                            ? 'font-bold text-gold-pale'
                            : 'font-medium text-side-inactive hover:text-white/90'
                        }`
                      }
                      style={({ isActive }) =>
                        isActive ? { background: 'rgba(201,169,59,0.12)' } : undefined
                      }
                    >
                      <span className="flex-1 truncate">{m.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2.5 flex items-center gap-2.5 px-1">
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-[#14332A]"
            style={{ background: 'linear-gradient(135deg,#E2C77E,#C9A93B)' }}
          >
            {profile ? initials(profile.full_name) : '—'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold">{profile?.full_name ?? '—'}</div>
            <div className="truncate text-[10.5px] text-[#9FB3A6]">{profile?.role ?? ''}</div>
          </div>
        </div>

        <button
          onClick={onToggleImmersive}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-field py-2.5 text-[12px] font-bold text-white/90 transition-colors hover:text-white"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {immersive ? (
              <path d="M8 3v4a1 1 0 0 1-1 1H3M21 8h-4a1 1 0 0 1-1-1V3M16 21v-4a1 1 0 0 1 1-1h4M3 16h4a1 1 0 0 1 1 1v4" />
            ) : (
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            )}
          </svg>
          {immersive ? 'Keluar layar penuh' : 'Layar penuh'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={onOpenPanduan}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-field py-2.5 text-[12px] font-bold text-white/90 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Panduan
          </button>
          <button
            onClick={() => void signOut()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-field py-2.5 text-[12px] font-bold text-white"
            style={{ background: 'rgba(179,38,30,0.22)', border: '1px solid rgba(245,198,189,0.28)' }}
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
