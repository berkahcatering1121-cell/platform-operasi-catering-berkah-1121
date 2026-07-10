import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[12.5px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
