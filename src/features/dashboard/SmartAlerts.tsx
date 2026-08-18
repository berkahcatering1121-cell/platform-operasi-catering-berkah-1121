import { useState } from 'react'
import type { Alert, AlertLevel } from './insights'
import Modal from '@/components/ui/Modal'
import { useT } from '@/lib/i18n'

const STYLE: Record<AlertLevel, { bg: string; border: string; dot: string; text: string }> = {
  danger: { bg: '#FBECEB', border: '#F5C6BD', dot: '#B3261E', text: '#8A1C16' },
  warn: { bg: '#FDF6E3', border: '#F0DCA0', dot: '#B7791F', text: '#7A5300' },
  ok: { bg: '#E9F6EE', border: '#BFE3CE', dot: '#1F7A4D', text: '#1B5E3B' },
}

function Icon({ level }: { level: AlertLevel }) {
  if (level === 'ok') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  )
}

/** Live finance alerts, colored by severity. Click one to see its calculation. */
export default function SmartAlerts({ alerts }: { alerts: Alert[] }) {
  const { t } = useT()
  const [open, setOpen] = useState<Alert | null>(null)
  const s = open ? STYLE[open.level] : null

  return (
    <div className="cb-card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-[13.5px] font-extrabold text-ink">{t('Peringatan Cerdas')}</span>
        {alerts[0]?.level !== 'ok' && (
          <span className="rounded-pill bg-danger-bg px-2 py-0.5 text-[10.5px] font-extrabold text-danger">
            {alerts.length}
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {alerts.map((a, i) => {
          const st = STYLE[a.level]
          const clickable = !!a.calc
          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setOpen(a)}
              className={`flex items-start gap-2.5 rounded-field px-3 py-2.5 text-left transition ${
                clickable ? 'cursor-pointer hover:brightness-[0.98]' : 'cursor-default'
              }`}
              style={{ background: st.bg, border: `1px solid ${st.border}` }}
            >
              <span className="mt-[1px] flex-none" style={{ color: st.dot }}>
                <Icon level={a.level} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="text-[12.5px] font-bold" style={{ color: st.text }}>
                    {a.title}
                  </div>
                  {clickable && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-none opacity-50"
                      style={{ color: st.text }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-ink-body">{a.detail}</div>
                {clickable && (
                  <div className="mt-1 text-[10.5px] font-bold" style={{ color: st.dot }}>
                    {t('Lihat perhitungan')}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} subtitle={open?.detail}>
        {open?.calc && s && (
          <div className="space-y-4">
            {/* Formula */}
            <div>
              <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-ink-muted">
                {t('Rumus')}
              </div>
              <div
                className="rounded-field px-3 py-2 text-[13px] font-bold"
                style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
              >
                {open.calc.formula}
              </div>
            </div>

            {/* Real figures */}
            <div>
              <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-ink-muted">
                {t('Angka nyata')}
              </div>
              <div className="overflow-hidden rounded-field border border-app-border">
                {open.calc.lines.map((l, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-[12.5px] ${
                      i > 0 ? 'border-t border-app-border' : ''
                    }`}
                  >
                    <span className="text-ink-body">{l.label}</span>
                    <span className="flex-none font-bold tabular-nums text-ink">{l.value}</span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between gap-3 border-t px-3 py-2.5 text-[13px] font-extrabold"
                  style={{ background: s.bg, borderColor: s.border, color: s.text }}
                >
                  <span>{t('Hasil')}</span>
                  <span className="flex-none tabular-nums">{open.calc.result}</span>
                </div>
              </div>
              {open.calc.target && (
                <div className="mt-1.5 text-[11.5px] font-semibold text-ink-muted">{open.calc.target}</div>
              )}
            </div>

            {/* Real-world action */}
            <div className="rounded-field border border-brand/25 bg-gold-tint/50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-extrabold text-brand-dark">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
                </svg>
                {t('Langkah nyata di lapangan')}
              </div>
              <div className="text-[12px] leading-relaxed text-ink-body">{open.calc.action}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
