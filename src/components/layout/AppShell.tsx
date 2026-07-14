import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import PanduanDrawer from './PanduanDrawer'
import BottomNav from './BottomNav'

/**
 * Layout shell: fixed deep-green sidebar on desktop; hamburger drawer + sticky
 * top bar on mobile. Content area max-width 1240px. Body scroll is locked when
 * the mobile drawer or Panduan is open.
 */
export default function AppShell() {
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [panduanOpen, setPanduanOpen] = useState(false)

  // Track viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 880px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Sync immersive state with the Fullscreen API (Esc / fullscreenchange).
  useEffect(() => {
    const onFs = () => {
      const el =
        document.fullscreenElement ??
        // @ts-expect-error vendor-prefixed
        document.webkitFullscreenElement
      if (!el) setImmersive(false)
    }
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs)
    }
  }, [])

  // Body scroll lock for overlays
  useEffect(() => {
    const anyOverlay = (isMobile && drawerOpen) || panduanOpen
    document.body.style.overflow = anyOverlay ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, drawerOpen, panduanOpen])

  const toggleImmersive = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setImmersive(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setImmersive(false)).catch(() => {})
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-app-bg">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 w-[236px]">
          <Sidebar
            immersive={immersive}
            onToggleImmersive={toggleImmersive}
            onOpenPanduan={() => setPanduanOpen(true)}
          />
        </aside>
      )}

      {/* Mobile drawer + scrim */}
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/45 transition-opacity ${
              drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[264px] transition-transform duration-[250ms]"
            style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(-105%)' }}
          >
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              immersive={immersive}
              onToggleImmersive={toggleImmersive}
              onOpenPanduan={() => {
                setDrawerOpen(false)
                setPanduanOpen(true)
              }}
            />
          </aside>
        </>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ marginLeft: isMobile ? 0 : 236 }}>
        {isMobile && (
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-app-border bg-app-card/95 px-4 py-3 backdrop-blur">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu"
              className="rounded-md p-1.5 text-ink-secondary"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/assets/logo-mark.svg" alt="" width={30} height={30} />
              <span className="text-[13.5px] font-extrabold text-ink">Catering Berkah 1121</span>
            </div>
          </header>
        )}

        <main
          className="mx-auto w-full max-w-content flex-1 px-[clamp(14px,2.5vw,28px)] py-[clamp(14px,2.5vw,28px)]"
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' } : undefined}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation (hides on scroll-down, shows on scroll-up).
          Hidden while the side drawer / Panduan is open to avoid double menus. */}
      {isMobile && !drawerOpen && !panduanOpen && <BottomNav onOpenMenu={() => setDrawerOpen(true)} />}

      <PanduanDrawer open={panduanOpen} onClose={() => setPanduanOpen(false)} />
    </div>
  )
}
