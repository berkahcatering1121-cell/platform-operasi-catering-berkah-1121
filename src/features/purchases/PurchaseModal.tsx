import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { formatRupiah } from '@/lib/format'
import { useEmployees, useIngredientCategories, useSuppliers } from '@/features/master/api'
import { useSavePurchase, type PurchaseInput } from './api'
import type { PurchaseView } from '@/lib/db'

const STATUS_OPTIONS = ['Lunas', 'DP', 'Belum Bayar'].map((s) => ({ value: s, label: s }))

interface FormState {
  purchase_date: string
  material_name: string
  category: string
  supplier_id: string
  qty: string
  unit: string
  unit_price: string
  status: string
  pic_employee_id: string
  notes: string
  photos: string[]
}

function toForm(p?: PurchaseView | null): FormState {
  return {
    purchase_date: p?.purchase_date ?? new Date().toISOString().slice(0, 10),
    material_name: p?.material_name ?? '',
    category: p?.category ?? '',
    supplier_id: p?.supplier_id ?? '',
    qty: p ? String(p.qty) : '',
    unit: p?.unit ?? 'kg',
    unit_price: p ? String(p.unit_price) : '',
    status: p?.status ?? 'Lunas',
    pic_employee_id: p?.pic_employee_id ?? '',
    notes: p?.notes ?? '',
    photos: p?.photos ?? [],
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: PurchaseView | null
}

export default function PurchaseModal({ open, onClose, editing }: Props) {
  const cats = useIngredientCategories()
  const suppliers = useSuppliers()
  const employees = useEmployees()
  const save = useSavePurchase()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const total = (Number(form.qty) || 0) * (Number(form.unit_price) || 0)

  const submit = () => {
    if (!form.material_name.trim() || save.isPending) return
    const payload: PurchaseInput = {
      id: editing?.id,
      purchase_date: form.purchase_date,
      material_name: form.material_name.trim(),
      category: form.category || null,
      supplier_id: form.supplier_id || null,
      qty: Number(form.qty) || 0,
      unit: form.unit || null,
      unit_price: Number(form.unit_price) || 0,
      status: form.status,
      pic_employee_id: form.pic_employee_id || null,
      notes: form.notes.trim() || null,
      photos: form.photos,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit Pembelian' : 'Tambah Pembelian'}
      subtitle="Total dihitung otomatis dari Qty × Harga Satuan"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.material_name.trim()}>
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
            value={form.purchase_date}
            onChange={(e) => set({ purchase_date: e.target.value })}
          />
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          />
        </div>

        <Field
          label="Bahan"
          value={form.material_name}
          onChange={(e) => set({ material_name: e.target.value })}
          placeholder="mis. Ayam Potong"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kategori Bahan"
            variant="master"
            options={(cats.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
            placeholder="Pilih kategori…"
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
          />
          <SelectField
            label="Supplier"
            variant="master"
            options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Pilih supplier…"
            value={form.supplier_id}
            onChange={(e) => set({ supplier_id: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Qty"
            inputMode="decimal"
            value={form.qty}
            onChange={(e) => set({ qty: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="40"
          />
          <Field
            label="Satuan"
            value={form.unit}
            onChange={(e) => set({ unit: e.target.value })}
            placeholder="kg / liter / pcs"
          />
          <Field
            label="Harga Satuan"
            prefix="Rp"
            inputMode="numeric"
            value={form.unit_price}
            onChange={(e) => set({ unit_price: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="38000"
          />
        </div>

        <Field label="Total" variant="auto" readOnly value={formatRupiah(total)} />

        <SelectField
          label="PIC"
          variant="master"
          options={(employees.data ?? []).map((e) => ({ value: e.id, label: `${e.name} — ${e.position ?? '-'}` }))}
          placeholder="Pilih PIC…"
          value={form.pic_employee_id}
          onChange={(e) => set({ pic_employee_id: e.target.value })}
        />

        <Field
          label="Catatan"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="opsional"
        />

        <PhotoUploader prefix="purchases" value={form.photos} onChange={(photos) => set({ photos })} />

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
