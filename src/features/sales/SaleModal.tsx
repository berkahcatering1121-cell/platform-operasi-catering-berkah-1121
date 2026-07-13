import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { formatRupiah } from '@/lib/format'
import { useEmployees, useMenuCategories, useMenuItems, usePaymentMethods } from '@/features/master/api'
import { useSaveSale, type SaleInput } from './api'
import type { SaleView } from '@/lib/db'

const STATUS_OPTIONS = ['Lunas', 'DP', 'Belum Bayar'].map((s) => ({ value: s, label: s }))

interface FormState {
  sale_date: string
  customer: string
  menu_category: string
  menu_name: string
  portions: string
  price_per_portion: string
  method: string
  status: string
  paid_amount: string
  pic_employee_id: string
  notes: string
  photos: string[]
}

function toForm(s?: SaleView | null): FormState {
  return {
    sale_date: s?.sale_date ?? new Date().toISOString().slice(0, 10),
    customer: s?.customer ?? '',
    menu_category: s?.menu_category ?? '',
    menu_name: s?.menu_name ?? '',
    portions: s ? String(s.portions) : '',
    price_per_portion: s ? String(s.price_per_portion) : '',
    method: s?.method ?? '',
    status: s?.status ?? 'Lunas',
    paid_amount: s ? String(s.paid_amount) : '0',
    pic_employee_id: s?.pic_employee_id ?? '',
    notes: s?.notes ?? '',
    photos: s?.photos ?? [],
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: SaleView | null
}

export default function SaleModal({ open, onClose, editing }: Props) {
  const menuCats = useMenuCategories()
  const menuItems = useMenuItems()
  const methods = usePaymentMethods()
  const employees = useEmployees()
  const save = useSaveSale()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const total = (Number(form.portions) || 0) * (Number(form.price_per_portion) || 0)
  const isLunas = form.status === 'Lunas'
  const sisa = isLunas ? 0 : Math.max(0, total - (Number(form.paid_amount) || 0))

  // Menu items filtered by the chosen category, for the Master-Data picker.
  const menuOptions = useMemo(() => {
    const list = (menuItems.data ?? []).filter(
      (m) => !form.menu_category || m.category_name === form.menu_category,
    )
    return list.map((m) => ({ value: m.id, label: `${m.name} · ${formatRupiah(m.sell_price)}` }))
  }, [menuItems.data, form.menu_category])

  // Picking a menu fills name + price (green: from Master Data, overridable).
  const pickMenu = (id: string) => {
    const m = (menuItems.data ?? []).find((x) => x.id === id)
    if (!m) return
    set({ menu_name: m.name, price_per_portion: String(m.sell_price), menu_category: m.category_name })
  }

  const submit = () => {
    if (!form.customer.trim() || save.isPending) return
    const payload: SaleInput = {
      id: editing?.id,
      sale_date: form.sale_date,
      customer: form.customer.trim(),
      menu_category: form.menu_category || null,
      menu_name: form.menu_name.trim() || null,
      portions: Number(form.portions) || 0,
      price_per_portion: Number(form.price_per_portion) || 0,
      method: form.method || null,
      status: form.status,
      paid_amount: isLunas ? total : Number(form.paid_amount) || 0,
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
      title={editing ? 'Edit Penjualan' : 'Tambah Penjualan'}
      subtitle="Total & Sisa Pembayaran dihitung otomatis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.customer.trim()}>
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
            value={form.sale_date}
            onChange={(e) => set({ sale_date: e.target.value })}
          />
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          />
        </div>

        <Field
          label="Customer / Event"
          value={form.customer}
          onChange={(e) => set({ customer: e.target.value })}
          placeholder="Ketik nama customer / event"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kategori Menu"
            variant="master"
            options={(menuCats.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
            placeholder="Pilih kategori…"
            value={form.menu_category}
            onChange={(e) => set({ menu_category: e.target.value, menu_name: '' })}
          />
          <SelectField
            label="Menu (dari Master Data)"
            variant="master"
            hint="mengisi nama & harga"
            options={menuOptions}
            placeholder="Pilih menu…"
            value=""
            onChange={(e) => pickMenu(e.target.value)}
          />
        </div>

        <Field
          label="Nama Menu"
          value={form.menu_name}
          onChange={(e) => set({ menu_name: e.target.value })}
          placeholder="Ketik atau pilih dari Menu di atas"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Porsi"
            inputMode="decimal"
            value={form.portions}
            onChange={(e) => set({ portions: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="Masukkan jumlah porsi"
          />
          <Field
            label="Harga / Porsi"
            variant="master"
            prefix="Rp"
            inputMode="numeric"
            hint="bisa di-override"
            value={form.price_per_portion}
            onChange={(e) => set({ price_per_portion: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan nominal"
          />
          <Field label="Total" variant="auto" readOnly value={formatRupiah(total)} />
        </div>

        {!isLunas && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Dibayar (DP)"
              prefix="Rp"
              inputMode="numeric"
              value={form.paid_amount}
              onChange={(e) => set({ paid_amount: e.target.value.replace(/[^\d]/g, '') })}
              placeholder="Masukkan nominal"
            />
            <Field label="Sisa Pembayaran" variant="auto" readOnly value={formatRupiah(sisa)} />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Metode"
            options={(methods.data ?? []).map((m) => ({ value: m.name, label: m.name }))}
            placeholder="Pilih metode…"
            value={form.method}
            onChange={(e) => set({ method: e.target.value })}
          />
          <SelectField
            label="PIC"
            variant="master"
            options={(employees.data ?? []).map((e) => ({ value: e.id, label: `${e.name} — ${e.position ?? '-'}` }))}
            placeholder="Pilih PIC…"
            value={form.pic_employee_id}
            onChange={(e) => set({ pic_employee_id: e.target.value })}
          />
        </div>

        <Field
          label="Catatan"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Opsional — ketik catatan"
        />

        <PhotoUploader prefix="sales" value={form.photos} onChange={(photos) => set({ photos })} />

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
