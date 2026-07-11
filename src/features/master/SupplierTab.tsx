import { useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import RowActions from '@/components/ui/RowActions'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import { TD, TH } from '@/components/ui/table'
import {
  useDeleteSupplier,
  useIngredientCategories,
  useSaveSupplier,
  useSuppliers,
} from './api'
import type { Supplier } from '@/lib/db'

interface FormState {
  id?: string
  name: string
  category: string
  phone: string
}
const EMPTY: FormState = { name: '', category: '', phone: '' }

export default function SupplierTab() {
  const suppliers = useSuppliers()
  const cats = useIngredientCategories()
  const save = useSaveSupplier()
  const del = useDeleteSupplier()

  const [form, setForm] = useState<FormState | null>(null)
  const [toDelete, setToDelete] = useState<Supplier | null>(null)

  if (suppliers.isLoading) return <LoadingRows />
  if (suppliers.error) return <ErrorState message={(suppliers.error as Error).message} />

  const catOptions = (cats.data ?? []).map((c) => ({ value: c.name, label: c.name }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim() || save.isPending) return
    save.mutate(
      { id: form.id, name: form.name, category: form.category || null, phone: form.phone || null },
      { onSuccess: () => setForm(null) },
    )
  }

  return (
    <>
      <Card
        title="Supplier"
        subtitle={`${suppliers.data?.length ?? 0} supplier terdaftar`}
        action={<Button onClick={() => setForm({ ...EMPTY })}>+ Supplier</Button>}
        bodyClassName=""
      >
        <div className="cb-scroll overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Nama</th>
                <th className={TH}>Kategori</th>
                <th className={TH}>Kontak</th>
                <th className={TH + ' text-right'}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.data && suppliers.data.length > 0 ? (
                suppliers.data.map((s) => (
                  <tr key={s.id}>
                    <td className={TD + ' font-bold text-ink'}>{s.name}</td>
                    <td className={TD}>{s.category ?? '—'}</td>
                    <td className={TD}>{s.phone ?? '—'}</td>
                    <td className={TD + ' text-right'}>
                      <RowActions
                        onEdit={() =>
                          setForm({ id: s.id, name: s.name, category: s.category ?? '', phone: s.phone ?? '' })
                        }
                        onDelete={() => setToDelete(s)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="Belum ada supplier. Tambah lewat tombol + Supplier." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit Supplier' : 'Tambah Supplier'}
        subtitle="Data supplier untuk Pembelian Bahan Baku"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={save.isPending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending || !form?.name.trim()}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        {form && (
          <form onSubmit={submit} className="space-y-3.5">
            <InputLegend />
            <Field
              label="Nama Supplier"
              variant="manual"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Agen Ayam Barokah"
              autoFocus
            />
            <SelectField
              label="Kategori Bahan"
              variant="master"
              options={catOptions}
              placeholder="Pilih kategori…"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Field
              label="Kontak"
              variant="manual"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="mis. 0812-3456-7890"
            />
            {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus supplier "${toDelete?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
