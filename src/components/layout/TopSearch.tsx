import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODULES } from '@/lib/modules'
import { useAuth } from '@/auth/AuthProvider'

/**
 * Functional module search for the mobile top bar: type to filter the modules
 * the user can access, tap a result to navigate there.
 */
export default function TopSearch() {
  const { canAccess } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<number | undefined>(undefined)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return MODULES.filter((m) => canAccess(m.key) && m.label.toLowerCase().includes(term)).slice(0, 6)
  }, [q, canAccess])

  const go = (path: string) => {
    navigate(path)
    setQ('')
    setFocused(false)
  }

  const open = focused && results.length > 0

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-field border border-app-border bg-app-panel px-3 py-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A7B68" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setFocused(false), 120)
          }}
          placeholder="Cari modul…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Bersihkan" className="text-ink-faint hover:text-ink-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-field border border-app-border bg-app-card shadow-card">
          {results.map((m) => (
            <button
              key={m.key}
              // onMouseDown fires before the input's onBlur so navigation isn't cancelled.
              onMouseDown={(e) => {
                e.preventDefault()
                go(m.path)
              }}
              className="flex w-full items-center gap-2.5 border-b border-app-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-app-panel"
            >
              <span className="flex text-brand [&>svg]:h-[18px] [&>svg]:w-[18px]">{m.icon}</span>
              <span className="text-[13px] font-semibold text-ink">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
