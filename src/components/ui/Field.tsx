import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

// Input-colour convention:
//   manual = blue  (user types it)
//   master = green (pulled from Master Data, may be overridable)
//   auto   = neutral/black read-only (computed)
export type FieldVariant = 'manual' | 'master' | 'auto'

const VARIANT_CLASS: Record<FieldVariant, string> = {
  manual: 'field-manual',
  master: 'field-master',
  auto: 'field-auto',
}

function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <label className="text-[12px] font-semibold text-ink-body">{children}</label>
      {hint && <span className="text-[10.5px] text-ink-faint">{hint}</span>}
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: string
  variant?: FieldVariant
  prefix?: string
}

export function Field({ label, hint, variant = 'manual', prefix, className = '', ...rest }: FieldProps) {
  return (
    <div className={className}>
      {label && <Label hint={hint}>{label}</Label>}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          className={`h-11 w-full rounded-field text-[14px] font-semibold outline-none ${VARIANT_CLASS[variant]} ${
            prefix ? 'pl-9 pr-3' : 'px-3'
          } ${rest.readOnly ? 'cursor-default' : ''}`}
          {...rest}
        />
      </div>
    </div>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: string
  variant?: FieldVariant
  options: { value: string; label: string }[]
  placeholder?: string
}

export function SelectField({
  label,
  hint,
  variant = 'manual',
  options,
  placeholder,
  className = '',
  ...rest
}: SelectFieldProps) {
  return (
    <div className={className}>
      {label && <Label hint={hint}>{label}</Label>}
      <select
        className={`h-11 w-full rounded-field px-3 text-[14px] font-semibold outline-none ${VARIANT_CLASS[variant]}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// The blue/green/neutral legend shown in add/edit modals.
export function InputLegend() {
  const items: { v: FieldVariant; label: string }[] = [
    { v: 'manual', label: 'Input manual' },
    { v: 'master', label: 'Dari Master Data' },
    { v: 'auto', label: 'Otomatis' },
  ]
  const dot: Record<FieldVariant, string> = {
    manual: 'bg-manual',
    master: 'bg-master',
    auto: 'bg-[#9A8E7C]',
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.v} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <span className={`h-2.5 w-2.5 rounded-sm ${dot[it.v]}`} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
