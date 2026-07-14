import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Kept for API compatibility; intentionally no longer rendered. */
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, actions }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-ink">{title}</h1>
      </div>
      {actions}
    </div>
  )
}
