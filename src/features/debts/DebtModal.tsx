import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/format'
import { useSaveDebt, type DebtInput } from './api'
import type { DebtView } from '@/lib/db'

interface FormState {
  debt_date: string
  creditor: string
  debt_type: string
  description: string
  amount: string
  due_date: string
  paid_amount: string
}

function toForm(d?: DebtView | null): FormState {
  return {
    debt_date: d?.debt_date ?? new Date().toISOString().slice(0, 10),
    creditor: d?.creditor ?? '',
    debt_type: d?.debt_type ?? '',
    description: d?.description ?? '',
    amount: d ? String(d.amount) : '',
    due_date: d?.due_date ?? '',
    paid_amount: d ? String(d.paid_amount) : '0',
  }
}

// Preview the same status the DB view will compute, for immediate feedback.
function previewStatus(amount: number, paid: number, due: string): string {
  if (paid >= amount && amount > 0) return 'Lunas'
  if (due && due < new Date().toISOString().slice(0, 10)) return 'Jatuh Tempo'
  return 'Belum Lunas'
}

interface Props {
  open: boolean
  onClose: () => void
  editing: DebtView | null
}

export default function DebtModal({ open, onClose, editing }: Props) {
  const save = useSaveDebt()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const amount = Number(form.amount) || 0
  const paid = Number(form.paid_amount) || 0
  const sisa = Math.max(0, amount - paid)
  const status = useMemo(() => previewStatus(amount, paid, form.due_date), [amount, paid, form.due_date])

  const submit = () => {
    if (!form.creditor.trim() || save.isPending) return
    const payload: DebtInput = {
      id: editing?.id,
      debt_date: form.debt_date,
      creditor: form.creditor.trim(),
      debt_type: form.debt_type.trim() || null,
      description: form.description.trim() || null,
      amount,
      due_date: form.due_date || null,
      paid_amount: paid,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Hutang' : 'Tambah Hutang'}
      subtitle="Sisa & status dihitung otomatis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.creditor.trim()}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <InputLegend />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tgl Hutang" type="date" value={form.debt_date} onChange={(e) => set({ debt_date: e.target.value })} />
          <Field label="Jatuh Tempo" type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Kreditur"
            value={form.creditor}
            onChange={(e) => set({ creditor: e.target.value })}
            placeholder="Ketik Nama Kreditur"
          />
          <Field
            label="Jenis"
            value={form.debt_type}
            onChange={(e) => set({ debt_type: e.target.value })}
            placeholder="Ketik Jenis Hutang"
          />
        </div>

        <Field
          label="Keterangan"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ketik Keterangan"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Jumlah"
            prefix="Rp"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan Nominal"
          />
          <Field
            label="Sudah Dibayar"
            prefix="Rp"
            inputMode="numeric"
            value={form.paid_amount}
            onChange={(e) => set({ paid_amount: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan Nominal"
          />
        </div>

        <div className="flex items-center justify-between rounded-field border border-auto-border bg-auto-bg px-3 py-2.5">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Sisa</div>
            <div className="mt-0.5 text-[15px] font-extrabold tabular-nums text-ink">{formatRupiah(sisa)}</div>
          </div>
          <div className="text-right">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Status</div>
            <StatusBadge status={status} />
          </div>
        </div>

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
