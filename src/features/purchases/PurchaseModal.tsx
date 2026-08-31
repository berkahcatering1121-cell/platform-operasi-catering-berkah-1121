import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { formatRupiah } from '@/lib/format'
import { useEmployees, useIngredientCategories, useSuppliers } from '@/features/master/api'
import { useSavePurchase, type PurchaseInput } from './api'
import { SATUAN_OPTIONS, type PurchaseView } from '@/lib/db'

const STATUS_OPTIONS = ['Lunas', 'DP', 'Belum Bayar'].map((s) => ({ value: s, label: s }))
const UNIT_OPTIONS = SATUAN_OPTIONS.map((u) => ({ value: u, label: u }))

// Turn a raw Postgres/Supabase error into a plain-language hint so the user can
// see what actually blocked the save (there is no date-based rule).
function errorHint(msg: string): string | null {
  const m = msg.toLowerCase()
  if (m.includes('numeric field overflow') || m.includes('out of range'))
    return 'Angka terlalu besar. Qty maksimal sekitar 1 miliar, Harga Satuan maksimal sekitar 1 triliun. Periksa Qty/Harga Satuan pada baris ini.'
  if (m.includes('foreign key') || m.includes('violates foreign key'))
    return 'Kategori, Supplier, atau PIC yang dipilih tidak ada di Master Data (mungkin sudah dihapus/diubah). Pilih ulang dari daftar.'
  if (m.includes('null value') && m.includes('purchase_date')) return 'Tanggal wajib diisi.'
  if (m.includes('null value') && m.includes('material_name')) return 'Nama Bahan wajib diisi.'
  if (m.includes('invalid input syntax for type date') || m.includes('date/time field value out of range'))
    return 'Format tanggal tidak valid. Pilih tanggal lewat kalender.'
  if (m.includes('row-level security') || m.includes('permission') || m.includes('not authorized'))
    return 'Tidak punya izin, atau sesi login sudah berakhir. Coba keluar lalu masuk lagi.'
  if (m.includes('jwt') || m.includes('token') || m.includes('expired'))
    return 'Sesi login berakhir. Keluar lalu masuk kembali, lalu coba simpan lagi.'
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Koneksi ke server terputus. Periksa internet lalu coba lagi.'
  return null
}

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

        {save.isError && (
          <div className="rounded-field border border-danger-border bg-danger-bg px-3.5 py-3">
            <div className="text-[12.5px] font-extrabold text-danger">Gagal menyimpan</div>
            {errorHint((save.error as Error).message) && (
              <div className="mt-1 text-[12px] font-semibold text-ink-body">{errorHint((save.error as Error).message)}</div>
            )}
            <div className="mt-1 break-words text-[11px] text-ink-muted">
              Pesan sistem: {(save.error as Error).message}
            </div>
          </div>
        )}

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
          placeholder="Ketik Nama Bahan"
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
            placeholder="Masukkan Jumlah"
          />
          <SelectField
            label="Satuan"
            options={UNIT_OPTIONS}
            value={form.unit}
            onChange={(e) => set({ unit: e.target.value })}
          />
          <Field
            label="Harga Satuan"
            prefix="Rp"
            inputMode="numeric"
            value={form.unit_price}
            onChange={(e) => set({ unit_price: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan Nominal"
          />
        </div>

        <Field label="Total" variant="auto" readOnly value={formatRupiah(total)} />

        <SelectField
          label="PIC"
          variant="master"
          options={(employees.data ?? []).map((e) => ({ value: e.id, label: `${e.name} · ${e.position ?? '-'}` }))}
          placeholder="Pilih PIC…"
          value={form.pic_employee_id}
          onChange={(e) => set({ pic_employee_id: e.target.value })}
        />

        <Field
          label="Catatan"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Opsional, Ketik Catatan"
        />

        <PhotoUploader prefix="purchases" value={form.photos} onChange={(photos) => set({ photos })} />
      </div>
    </Modal>
  )
}
