import { useEffect, useState } from 'react'
import { days, months } from '@/lib/format'
import { useT } from '@/lib/i18n'

const pad = (n: number) => String(n).padStart(2, '0')

/** Live day + date + running digital clock (updates every second). */
export default function LiveClock() {
  useT() // re-render when the language switches
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand text-gold-pale">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="text-[12.5px] font-semibold text-ink-body">
          {days()[now.getDay()]}, {now.getDate()} {months()[now.getMonth()]} {now.getFullYear()}
        </div>
        <div className="font-mono text-[22px] font-extrabold tracking-tight text-ink tabular-nums">
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </div>
      </div>
    </div>
  )
}
