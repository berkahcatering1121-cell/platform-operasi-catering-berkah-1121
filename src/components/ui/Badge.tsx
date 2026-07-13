import type { MarginHealth } from '@/lib/db'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral'

const TONE: Record<Tone, string> = {
  green: 'text-ok bg-ok-bg border-ok-border',
  amber: 'text-warn bg-warn-bg border-warn-border',
  red: 'text-danger bg-danger-bg border-danger-border',
  blue: 'text-manual bg-[#EEF4FD] border-manual-border',
  neutral: 'text-ink-secondary bg-[#F2EFEA] border-[#E2DACB]',
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-pill border px-[9px] py-[3px] text-[10.5px] font-extrabold tracking-[0.03em] ${TONE[tone]}`}
    >
      {children}
    </span>
  )
}

// Map a payment-status string to a tone (mirrors the seed `kind` values).
const STATUS_TONE: Record<string, Tone> = {
  Lunas: 'green', Dibayar: 'green', Settle: 'green', Aktif: 'green',
  DP: 'amber', 'Belum Lunas': 'amber',
  'Belum Bayar': 'red', 'Jatuh Tempo': 'red', 'Not Settle Yet': 'red',
  Harian: 'blue', Bulanan: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>
}

// Margin health pill for the Menu table + recipe editor.
export function MarginBadge({
  health,
  label,
}: {
  health: MarginHealth
  label: string
}) {
  const tone: Tone = health === 'green' ? 'green' : health === 'amber' ? 'amber' : health === 'red' ? 'red' : 'neutral'
  return <Badge tone={tone}>{label}</Badge>
}

export const marginNote = (health: MarginHealth): string =>
  health === 'none'
    ? 'Isi HPP dulu'
    : health === 'green'
      ? 'Harga sehat'
      : health === 'amber'
        ? 'Margin tipis'
        : 'Rugi / terlalu murah'
