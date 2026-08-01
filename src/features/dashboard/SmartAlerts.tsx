import type { Alert, AlertLevel } from './insights'
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

/** Live finance alerts, colored by severity. */
export default function SmartAlerts({ alerts }: { alerts: Alert[] }) {
  const { t } = useT()
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
          const s = STYLE[a.level]
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-field px-3 py-2.5"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span className="mt-[1px] flex-none" style={{ color: s.dot }}>
                <Icon level={a.level} />
              </span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold" style={{ color: s.text }}>
                  {a.title}
                </div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-ink-body">{a.detail}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
