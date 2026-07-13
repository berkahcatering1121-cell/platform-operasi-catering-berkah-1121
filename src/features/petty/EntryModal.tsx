import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { useSaveEntry, type EntryInput } from './api'
import type { PettyEntryView } from '@/lib/db'

interface FormState {
  entry_date: string
  description: string
  kind: 'in' | 'out'
  amount: string
  photos: string[]
}

function toForm(e?: PettyEntryView | null, periodMonth?: string): FormState {
  const fallbackDate = periodMonth ? `${periodMonth}-01` : new Date().toISOString().slice(0, 10)
  return {
    entry_date: e?.entry_date ?? fallbackDate,
    description: e?.description ?? '',
    kind: e ? (e.cash_in > 0 ? 'in' : 'out') : 'out',
    amount: e ? String(e.cash_in > 0 ? e.cash_in : e.cash_out) : '',
    photos: e?.photos ?? [],
  }
}

interface Props {
  open: boolean
  onClose: () => void
  periodId: string
  periodMonth: string // YYYY-MM
  editing: PettyEntryView | null
}

export default function EntryModal({ open, onClose, periodId, periodMonth, editing }: Props) {
  const save = useSaveEntry()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing, periodMonth))
  }, [open, editing, periodMonth])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = () => {
    if (!form.description.trim() || save.isPending) return
    const amt = Number(form.amount) || 0
    const payload: EntryInput = {
      id: editing?.id,
      period_id: periodId,
      entry_date: form.entry_date,
      description: form.description.trim(),
      cash_in: form.kind === 'in' ? amt : 0,
      cash_out: form.kind === 'out' ? amt : 0,
      photos: form.photos,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas'}
      subtitle="Saldo berjalan dihitung otomatis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.description.trim()}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <InputLegend />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal" type="date" value={form.entry_date} onChange={(e) => set({ entry_date: e.target.value })} />
          <SelectField
            label="Jenis"
            options={[
              { value: 'out', label: 'Keluar (pengeluaran)' },
              { value: 'in', label: 'Masuk (top up)' },
            ]}
            value={form.kind}
            onChange={(e) => set({ kind: e.target.value as 'in' | 'out' })}
          />
        </div>
        <Field
          label="Keterangan"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ketik Keterangan"
        />
        <Field
          label="Jumlah"
          prefix="Rp"
          inputMode="numeric"
          value={form.amount}
          onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, '') })}
          placeholder="Masukkan Nominal"
        />
        <PhotoUploader prefix="petty" label="Foto Bukti" value={form.photos} onChange={(photos) => set({ photos })} />
        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
