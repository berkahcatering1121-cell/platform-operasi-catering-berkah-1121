import { useMemo } from 'react'
import { ID_MONTHS_SHORT, formatRupiahShort } from '@/lib/format'

export interface Series {
  label: string
  color: string
  values: number[]
}

interface Props {
  series: Series[]
  /** X-axis labels; defaults to the 12 short month names. */
  labels?: string[]
}

/**
 * Monthly line chart (inline SVG) — Pendapatan / Pembelian / Laba Bersih.
 * Values are scaled to the combined maximum; the y-axis is labelled in juta.
 */
export default function LineChart({ series, labels }: Props) {
  const xLabels = labels ?? ID_MONTHS_SHORT
  const n = Math.max(1, series[0]?.values.length ?? xLabels.length)
  const W = 820
  const H = 280
  const padL = 46
  const padR = 12
  const padT = 16
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values))
    // Round up to a "nice" ceiling.
    const mag = Math.pow(10, Math.floor(Math.log10(m)))
    return Math.ceil(m / mag) * mag
  }, [series])

  const x = (i: number) => padL + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2)
  const y = (v: number) => padT + (1 - v / max) * plotH
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)

  return (
    <div className="w-full overflow-x-auto cb-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        {/* grid + y labels */}
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)} stroke="#EDE6DB" strokeWidth={1} />
            <text x={padL - 6} y={y(gv) + 3} textAnchor="end" fontSize={9.5} fill="#A79A87">
              {Math.round(gv / 1e6)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {xLabels.map((m, i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={9.5} fill="#A79A87">
            {m}
          </text>
        ))}
        {/* lines + dots */}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={2.6} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-1 px-2 text-[10.5px] text-ink-faint">Angka sumbu dalam juta Rupiah · nilai puncak {formatRupiahShort(max)}</div>
    </div>
  )
}
