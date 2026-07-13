import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { usePaymentMethods } from '@/features/master/api'
import { useSaveOpex, type OpexInput } from './api'
import { OPEX_CATEGORIES, type OperationalCost } from '@/lib/db'

interface FormState {
  cost_date: string
  description: string
  category: string
  amount: string
  method: string
  notes: string
  photos: string[]
}

function toForm(o?: OperationalCost | null): FormState {
  return {
    cost_date: o?.cost_date ?? new Date().toISOString().slice(0, 10),
    description: o?.description ?? '',
    category: o?.category ?? OPEX_CATEGORIES[0],
    amount: o ? String(o.amount) : '',
    method: o?.method ?? '',
    notes: o?.notes ?? '',
    photos: o?.photos ?? [],
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: OperationalCost | null
}

export default function OpexModal({ open, onClose, editing }: Props) {
  const methods = usePaymentMethods()
  const save = useSaveOpex()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = () => {
    if (!form.description.trim() || save.isPending) return
    const payload: OpexInput = {
      id: editing?.id,
      cost_date: form.cost_date,
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount) || 0,
      method: form.method || null,
      notes: form.notes.trim() || null,
      photos: form.photos,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
      subtitle="Catat beban per kategori dengan foto nota"
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
          <Field
            label="Tanggal"
            type="date"
            value={form.cost_date}
            onChange={(e) => set({ cost_date: e.target.value })}
          />
          <Field
            label="Jumlah"
            prefix="Rp"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan Nominal"
          />
        </div>

        <Field
          label="Keterangan"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ketik Keterangan"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kategori"
            options={OPEX_CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
          />
          <SelectField
            label="Metode"
            options={(methods.data ?? []).map((m) => ({ value: m.name, label: m.name }))}
            placeholder="Pilih metode…"
            value={form.method}
            onChange={(e) => set({ method: e.target.value })}
          />
        </div>

        <Field
          label="Catatan"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Opsional — Ketik Catatan"
        />

        <PhotoUploader
          prefix="opex"
          label="Foto Nota"
          value={form.photos}
          onChange={(photos) => set({ photos })}
        />

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
