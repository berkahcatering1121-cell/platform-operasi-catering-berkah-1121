import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend } from '@/components/ui/Field'
import { formatRupiah } from '@/lib/format'
import { useSaveAsset, type AssetInput } from './api'
import type { AssetView } from '@/lib/db'

interface FormState {
  acquisition_date: string
  name: string
  category: string
  acquisition_cost: string
  economic_life_months: string
  residual_value: string
}

function toForm(a?: AssetView | null): FormState {
  return {
    acquisition_date: a?.acquisition_date ?? new Date().toISOString().slice(0, 10),
    name: a?.name ?? '',
    category: a?.category ?? '',
    acquisition_cost: a ? String(a.acquisition_cost) : '',
    economic_life_months: a ? String(a.economic_life_months) : '48',
    residual_value: a ? String(a.residual_value) : '0',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: AssetView | null
}

export default function AssetModal({ open, onClose, editing }: Props) {
  const save = useSaveAsset()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const cost = Number(form.acquisition_cost) || 0
  const residu = Number(form.residual_value) || 0
  const life = Number(form.economic_life_months) || 0
  const depPerMonth = life > 0 ? Math.round((cost - residu) / life) : 0

  const submit = () => {
    if (!form.name.trim() || life <= 0 || save.isPending) return
    const payload: AssetInput = {
      id: editing?.id,
      acquisition_date: form.acquisition_date,
      name: form.name.trim(),
      category: form.category.trim() || null,
      acquisition_cost: cost,
      economic_life_months: life,
      residual_value: residu,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Aset' : 'Tambah Aset'}
      subtitle="Depresiasi garis lurus, otomatis mengalir ke P&L"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.name.trim() || life <= 0}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <InputLegend />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Tgl Perolehan"
            type="date"
            value={form.acquisition_date}
            onChange={(e) => set({ acquisition_date: e.target.value })}
          />
          <Field
            label="Kategori"
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
            placeholder="Ketik kategori aset"
          />
        </div>

        <Field
          label="Nama Aset"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Ketik nama aset"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Harga Perolehan"
            prefix="Rp"
            inputMode="numeric"
            value={form.acquisition_cost}
            onChange={(e) => set({ acquisition_cost: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan nominal"
          />
          <Field
            label="Umur (bulan)"
            inputMode="numeric"
            value={form.economic_life_months}
            onChange={(e) => set({ economic_life_months: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan jumlah bulan"
          />
          <Field
            label="Nilai Residu"
            prefix="Rp"
            inputMode="numeric"
            value={form.residual_value}
            onChange={(e) => set({ residual_value: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan nominal"
          />
        </div>

        <div className="rounded-field border border-auto-border bg-auto-bg px-3 py-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
            Depresiasi / Bulan (garis lurus)
          </div>
          <div className="mt-0.5 text-[15px] font-extrabold tabular-nums text-ink">{formatRupiah(depPerMonth)}</div>
          <div className="mt-1 text-[11px] text-ink-muted">(Harga Perolehan − Nilai Residu) ÷ Umur Ekonomis</div>
        </div>

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
