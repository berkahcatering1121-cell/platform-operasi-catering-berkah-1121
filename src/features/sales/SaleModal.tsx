import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { formatRupiah } from '@/lib/format'
import { useEmployees, useMenuCategories, useMenuItems, usePaymentMethods } from '@/features/master/api'
import { useSaveSale, type SaleInput } from './api'
import { generateInvoicePdf, invoiceNumberFor, type InvoiceData } from './invoice'
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
  // After a successful save we keep the modal open on a confirmation panel so
  // the auto-generated invoice can be re-downloaded without re-entering data.
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toForm(editing))
      setSaved(false)
    }
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

  // Picking a sub-menu fills name + price (green: from Master Data).
  const pickMenu = (id: string) => {
    const m = (menuItems.data ?? []).find((x) => x.id === id)
    if (!m) return
    set({ menu_name: m.name, price_per_portion: String(m.sell_price), menu_category: m.category_name })
  }

  // The sale stores the menu name; map it back to the item id so the dropdown
  // shows the currently selected sub-menu.
  const selectedMenuId = useMemo(() => {
    const m = (menuItems.data ?? []).find(
      (x) => x.name === form.menu_name && (!form.menu_category || x.category_name === form.menu_category),
    )
    return m?.id ?? ''
  }, [menuItems.data, form.menu_name, form.menu_category])

  // Build the invoice straight from the entered sale (total = portions x harga).
  const buildInvoice = (): InvoiceData => {
    const picName = (employees.data ?? []).find((e) => e.id === form.pic_employee_id)?.name ?? null
    const paid = isLunas ? total : Number(form.paid_amount) || 0
    return {
      invoiceNo: invoiceNumberFor(form.sale_date, form.customer.trim(), editing?.id),
      sale_date: form.sale_date,
      customer: form.customer.trim(),
      menu_name: form.menu_name.trim() || null,
      menu_category: form.menu_category || null,
      portions: Number(form.portions) || 0,
      price_per_portion: Number(form.price_per_portion) || 0,
      total,
      paid_amount: paid,
      sisa,
      status: form.status,
      method: form.method || null,
      pic_name: picName,
      notes: form.notes.trim() || null,
    }
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
    save.mutate(payload, {
      onSuccess: () => {
        // Auto-generate the invoice the moment the sale is saved.
        void generateInvoicePdf(buildInvoice())
        setSaved(true)
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit Penjualan' : 'Tambah Penjualan'}
      subtitle="Total & Sisa Pembayaran dihitung otomatis"
      footer={
        saved ? (
          <>
            <Button variant="secondary" onClick={() => void generateInvoicePdf(buildInvoice())}>
              Unduh ulang Invoice
            </Button>
            <Button onClick={onClose}>Selesai</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending || !form.customer.trim()}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        )
      }
    >
      {saved ? (
        <div className="space-y-3 py-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok/10 text-ok">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="text-[15px] font-extrabold text-ink">Penjualan tersimpan</div>
          <div className="mx-auto max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
            Invoice otomatis dibuat untuk <span className="font-bold text-ink">{form.customer.trim() || '-'}</span> dan
            terunduh sebagai PDF. Totalnya{' '}
            <span className="font-bold text-ink">{formatRupiah(total)}</span> ({form.portions || 0} porsi x{' '}
            {formatRupiah(Number(form.price_per_portion) || 0)}).
          </div>
        </div>
      ) : (
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
          placeholder="Ketik Nama Customer / Event"
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
            label="Sub-Menu (dari Master Data)"
            variant="master"
            hint="harga terisi otomatis"
            options={menuOptions}
            placeholder="Pilih sub-menu…"
            value={selectedMenuId}
            onChange={(e) => pickMenu(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Porsi"
            inputMode="decimal"
            value={form.portions}
            onChange={(e) => set({ portions: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="Masukkan Jumlah Porsi"
          />
          <Field
            label="Harga / Porsi"
            variant="master"
            prefix="Rp"
            inputMode="numeric"
            hint="bisa di-override"
            value={form.price_per_portion}
            onChange={(e) => set({ price_per_portion: e.target.value.replace(/[^\d]/g, '') })}
            placeholder="Masukkan Nominal"
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
              placeholder="Masukkan Nominal"
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
            options={(employees.data ?? []).map((e) => ({ value: e.id, label: `${e.name} · ${e.position ?? '-'}` }))}
            placeholder="Pilih PIC…"
            value={form.pic_employee_id}
            onChange={(e) => set({ pic_employee_id: e.target.value })}
          />
        </div>

        <Field
          label="Catatan"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Opsional, Ketik Catatan"
        />

        <PhotoUploader prefix="sales" value={form.photos} onChange={(photos) => set({ photos })} />

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
      )}
    </Modal>
  )
}
