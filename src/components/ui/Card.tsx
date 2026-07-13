import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function Card({ title, subtitle, action, children, className = '', bodyClassName = '' }: CardProps) {
  return (
    <div className={`cb-card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-3">
          <div>
            {title && <div className="text-[13.5px] font-extrabold text-ink">{title}</div>}
            {subtitle && <div className="mt-0.5 text-[11.5px] text-ink-muted">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName || 'p-4'}>{children}</div>
    </div>
  )
}

// Small state helpers for query panels.
export function LoadingRows({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-ink-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-app-border border-t-brand" />
      {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-field border border-danger-border bg-danger-bg px-4 py-3 text-center text-[12.5px] font-medium text-danger">
      {message}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-10 text-center text-[12.5px] text-ink-muted">{message}</div>
}
