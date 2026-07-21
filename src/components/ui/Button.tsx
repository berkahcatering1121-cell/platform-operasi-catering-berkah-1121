import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useT } from '@/lib/i18n'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-app-card text-ink-secondary border border-app-border hover:bg-app-panel',
  danger: 'bg-danger-bg text-danger border border-danger-border hover:brightness-95',
  ghost: 'bg-transparent text-ink-secondary hover:bg-app-panel',
}

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  const { t } = useT()
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-btn px-4 text-[13px] font-bold transition disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {typeof children === 'string' ? t(children) : children}
    </button>
  )
}
