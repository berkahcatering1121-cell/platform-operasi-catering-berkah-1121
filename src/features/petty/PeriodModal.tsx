import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend } from '@/components/ui/Field'
import { useSavePeriod, type PeriodInput } from './api'
import type { PettyPeriod } from '@/lib/db'

interface FormState {
  period: string // YYYY-MM
  opening_balance: string
  is_settled: boolean
}

function toForm(p?: PettyPeriod | null): FormState {
  const now = new Date()
  return {
    period: p ? p.period_month.slice(0, 7) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    opening_balance: p ? String(p.opening_balance) : '',
    is_settled: p?.is_settled ?? false,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: PettyPeriod | null
}

export default function PeriodModal({ open, onClose, editing }: Props) {
  const save = useSavePeriod()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = () => {
    if (save.isPending) return
    const payload: PeriodInput = {
      id: editing?.id,
      period_month: `${form.period}-01`,
      opening_balance: Number(form.opening_balance) || 0,
      is_settled: form.is_settled,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Periode Kas' : 'Tambah Periode Kas'}
      subtitle="Saldo Awal & status settle per bulan"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <InputLegend />
        <Field label="Periode" type="month" value={form.period} onChange={(e) => set({ period: e.target.value })} />
        <Field
          label="Saldo Awal"
          prefix="Rp"
          inputMode="numeric"
          value={form.opening_balance}
          onChange={(e) => set({ opening_balance: e.target.value.replace(/[^\d]/g, '') })}
          placeholder="Masukkan Nominal"
        />
        <label className="flex items-center gap-2.5 rounded-field border border-app-border bg-app-panel px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.is_settled}
            onChange={(e) => set({ is_settled: e.target.checked })}
            className="h-4 w-4 accent-[#1F7A4D]"
          />
          <span className="text-[12.5px] font-semibold text-ink-body">
            Sudah di-settle (kas kecil bulan ini selesai direkonsiliasi)
          </span>
        </label>
        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
