import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import WorkCalendar from '@/components/ui/WorkCalendar'
import { formatRupiah } from '@/lib/format'
import { useEmployees } from '@/features/master/api'
import { fetchPayrollDays, useSavePayroll, type PayrollInput } from './api'
import type { PayrollView } from '@/lib/db'

const STATUS_OPTIONS = [
  { value: 'Belum', label: 'Belum Bayar' },
  { value: 'Dibayar', label: 'Dibayar' },
]

// Weekly periods for daily (Harian) staff. Each week is a separate payroll
// entry with its own work dates + status.
const WEEK_OPTIONS = [
  'Minggu Pertama',
  'Minggu Kedua',
  'Minggu Ketiga',
  'Minggu Keempat',
  'Minggu Kelima',
]

interface FormState {
  employee_id: string
  period: string // YYYY-MM
  period_label: string
  pay_date: string
  work_dates: string[]
  allowance: string
  bonus: string
  deduction: string
  status: string
}

function toForm(p?: PayrollView | null): FormState {
  const now = new Date()
  return {
    employee_id: p?.employee_id ?? '',
    period: p ? p.period_month.slice(0, 7) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    period_label: p?.period_label ?? '',
    pay_date: p?.pay_date ?? '',
    work_dates: [],
    allowance: p ? String(p.allowance) : '0',
    bonus: p ? String(p.bonus) : '0',
    deduction: p ? String(p.deduction) : '0',
    status: p?.status ?? 'Belum',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: PayrollView | null
}

export default function PayrollModal({ open, onClose, editing }: Props) {
  const employees = useEmployees()
  const save = useSavePayroll()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (!open) return
    setForm(toForm(editing))
    if (editing) {
      fetchPayrollDays(editing.id).then((dates) => setForm((f) => ({ ...f, work_dates: dates })))
    }
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const emp = useMemo(
    () => (employees.data ?? []).find((e) => e.id === form.employee_id),
    [employees.data, form.employee_id],
  )
  const isHarian = emp?.salary_type === 'Harian'
  const days = form.work_dates.length
  const gajiDasar = emp ? (isHarian ? emp.daily_wage * days : emp.base_salary) : 0
  const totalBeban = gajiDasar + (Number(form.allowance) || 0) + (Number(form.bonus) || 0)
  const takeHome = totalBeban - (Number(form.deduction) || 0)

  // Keep only ticked dates that fall inside the chosen period month.
  const setPeriod = (period: string) =>
    setForm((f) => ({ ...f, period, work_dates: f.work_dates.filter((d) => d.startsWith(period)) }))

  const submit = () => {
    if (!form.employee_id || save.isPending) return
    const payload: PayrollInput = {
      id: editing?.id,
      employee_id: form.employee_id,
      period_month: `${form.period}-01`,
      period_label: form.period_label.trim() || null,
      pay_date: form.pay_date || null,
      days_worked: isHarian ? days : 0,
      allowance: Number(form.allowance) || 0,
      bonus: Number(form.bonus) || 0,
      deduction: Number(form.deduction) || 0,
      status: form.status,
      work_dates: isHarian ? form.work_dates : [],
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit Gaji' : 'Tambah Gaji'}
      subtitle="Gaji Dasar, Total Beban & Take Home dihitung otomatis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.employee_id}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <InputLegend />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Karyawan"
            variant="master"
            options={(employees.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.name} — ${e.salary_type}`,
            }))}
            placeholder="Pilih karyawan…"
            value={form.employee_id}
            onChange={(e) => set({ employee_id: e.target.value, work_dates: [], period_label: '' })}
          />
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Periode" type="month" value={form.period} onChange={(e) => setPeriod(e.target.value)} />
          <Field
            label="Tanggal Bayar"
            type="date"
            value={form.pay_date}
            onChange={(e) => set({ pay_date: e.target.value })}
          />
        </div>

        {emp && (
          <div className="rounded-field border border-master-border bg-master-bg px-3 py-2 text-[12px] text-master">
            {isHarian ? (
              <>Karyawan <b>Harian</b> · Upah/Hari {formatRupiah(emp.daily_wage)} — pilih minggu & centang tanggal masuk di kalender.</>
            ) : (
              <>Karyawan <b>Bulanan</b> · Gaji Pokok tetap {formatRupiah(emp.base_salary)} (tanpa minggu/kalender).</>
            )}
          </div>
        )}

        {/* Weekly period + work-date calendar — Harian only. Buat satu entri per
            minggu (Minggu Pertama, Kedua, …), masing-masing punya status sendiri. */}
        {emp && isHarian && (
          <>
            <SelectField
              label="Periode Minggu"
              hint="satu entri per minggu"
              options={WEEK_OPTIONS.map((w) => ({ value: w, label: w }))}
              placeholder="Pilih minggu…"
              value={form.period_label}
              onChange={(e) => set({ period_label: e.target.value })}
            />
            <WorkCalendar monthKey={form.period} selected={form.work_dates} onChange={(d) => set({ work_dates: d })} />
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Tunjangan"
            prefix="Rp"
            inputMode="numeric"
            value={form.allowance}
            onChange={(e) => set({ allowance: e.target.value.replace(/[^\d]/g, '') })}
          />
          <Field
            label="Bonus / Lembur"
            prefix="Rp"
            inputMode="numeric"
            value={form.bonus}
            onChange={(e) => set({ bonus: e.target.value.replace(/[^\d]/g, '') })}
          />
          <Field
            label="Potongan"
            prefix="Rp"
            inputMode="numeric"
            value={form.deduction}
            onChange={(e) => set({ deduction: e.target.value.replace(/[^\d]/g, '') })}
          />
        </div>

        {/* Live totals */}
        <div className="grid grid-cols-3 gap-2 rounded-field border border-auto-border bg-auto-bg p-3">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
              Gaji Dasar{isHarian ? ` · ${days} hari` : ''}
            </div>
            <div className="mt-1 text-[14px] font-extrabold tabular-nums text-ink">{formatRupiah(gajiDasar)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Total Beban</div>
            <div className="mt-1 text-[14px] font-extrabold tabular-nums text-ink">{formatRupiah(totalBeban)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Take Home Pay</div>
            <div className="mt-1 text-[14px] font-extrabold tabular-nums text-ok">{formatRupiah(takeHome)}</div>
          </div>
        </div>

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
