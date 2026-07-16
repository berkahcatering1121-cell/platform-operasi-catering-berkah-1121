import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { titleCase } from '@/lib/text'

interface Props {
  title: string
  /** Kept for API compatibility; intentionally no longer rendered. */
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, actions }: Props) {
  const { profile } = useAuth()

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {profile && (
          <div className="mb-0.5 text-[12.5px] font-semibold text-ink-muted">
            Welcome back, <span className="font-bold text-brand-green">{titleCase(profile.full_name)}</span>
          </div>
        )}
        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-ink">{title}</h1>
      </div>
      {actions}
    </div>
  )
}
