import { useState } from 'react'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useAddRefCategory,
  useDeleteRefCategory,
  useIngredientCategories,
  useMenuCategories,
  usePaymentMethods,
  usePaymentStatuses,
  useUpdateRefCategory,
} from './api'
import type { RefRow } from '@/lib/db'

type RefTable = 'ingredient_categories' | 'menu_categories'

function ChipRow({ items }: { items: { name: string; tone?: 'green' | 'amber' | 'red' | 'neutral' }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <Badge key={c.name} tone={c.tone ?? 'neutral'}>
          {c.name}
        </Badge>
      ))}
    </div>
  )
}

// A category chip with inline rename + delete affordances.
function EditableChip({
  item,
  isDuplicate,
  onEdit,
  onDelete,
}: {
  item: RefRow
  isDuplicate: (name: string, exceptId: string) => boolean
  onEdit: (id: string, name: string) => void
  onDelete: (item: RefRow) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.name)
  const [dup, setDup] = useState(false)

  const save = () => {
    const name = value.trim()
    if (!name || name === item.name) {
      setEditing(false)
      setValue(item.name)
      setDup(false)
      return
    }
    if (isDuplicate(name, item.id)) {
      setDup(true)
      return
    }
    onEdit(item.id, name)
    setEditing(false)
    setDup(false)
  }

  if (editing) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-pill border py-0.5 pl-2 pr-1 ${
          dup ? 'border-danger-border bg-danger-bg' : 'border-master-border bg-master-bg'
        }`}
        title={dup ? 'Nama sudah dipakai' : undefined}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setDup(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setEditing(false)
              setValue(item.name)
              setDup(false)
            }
          }}
          className={`w-[120px] bg-transparent text-[12.5px] font-semibold outline-none ${dup ? 'text-danger' : 'text-master'}`}
        />
        <button onClick={save} aria-label="Simpan" className="rounded-full p-1 text-master hover:bg-white/60">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        <button
          onClick={() => {
            setEditing(false)
            setValue(item.name)
          }}
          aria-label="Batal"
          className="rounded-full p-1 text-ink-muted hover:bg-white/60"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-center gap-1.5 rounded-pill border border-master-border bg-master-bg py-1 pl-3 pr-1.5 text-[12.5px] font-bold text-master">
      {item.name}
      <span className="flex items-center gap-0.5">
        <button
          onClick={() => {
            setValue(item.name)
            setEditing(true)
          }}
          aria-label={`Edit ${item.name}`}
          className="rounded-full p-1 text-master/70 hover:bg-white/70 hover:text-master"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item)}
          aria-label={`Hapus ${item.name}`}
          className="rounded-full p-1 text-master/70 hover:bg-danger-bg hover:text-danger"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </span>
    </span>
  )
}

function AddableCategoryCard({
  title,
  subtitle,
  items,
  table,
}: {
  title: string
  subtitle: string
  items: RefRow[] | undefined
  table: RefTable
}) {
  const [value, setValue] = useState('')
  const [dupError, setDupError] = useState('')
  const [toDelete, setToDelete] = useState<RefRow | null>(null)
  const add = useAddRefCategory(table)
  const update = useUpdateRefCategory(table)
  const del = useDeleteRefCategory(table)

  const list = items ?? []
  // Case-insensitive duplicate check so "Nasi Campur" == "nasi campur".
  const norm = (s: string) => s.trim().toLowerCase()
  const isDuplicate = (name: string, exceptId?: string) =>
    list.some((c) => c.id !== exceptId && norm(c.name) === norm(name))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = value.trim()
    if (!name || add.isPending) return
    if (isDuplicate(name)) {
      setDupError(`Kategori "${name}" sudah ada.`)
      return
    }
    add.mutate(name, { onSuccess: () => setValue('') })
  }

  const deleteMessage = toDelete
    ? table === 'menu_categories'
      ? `Hapus kategori "${toDelete.name}"? SEMUA menu dalam kategori ini akan ikut terhapus permanen.`
      : `Hapus kategori "${toDelete.name}"? Supplier & pembelian yang memakai kategori ini akan dikosongkan kategorinya.`
    : ''

  const err = add.error || update.error || del.error

  return (
    <Card
      title={title}
      subtitle={subtitle}
      action={
        <span className="flex-none whitespace-nowrap rounded-pill border border-master-border bg-master-bg px-3 py-1 text-[12px] font-extrabold text-master">
          {list.length} kategori
        </span>
      }
    >
      <div className="mb-3">
        {list.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {list.map((c) => (
              <EditableChip
                key={c.id}
                item={c}
                isDuplicate={isDuplicate}
                onEdit={(id, name) => update.mutate({ id, name })}
                onDelete={(item) => setToDelete(item)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-field border border-dashed border-app-border py-6 text-center text-[12px] text-ink-muted">
            Belum ada kategori.
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setDupError('')
          }}
          placeholder="Tambah kategori baru…"
          className="field-manual h-10 flex-1 rounded-field px-3 text-[13px] font-semibold outline-none"
        />
        <button
          type="submit"
          disabled={add.isPending || !value.trim()}
          className="inline-flex h-10 items-center gap-1 rounded-btn bg-brand px-3.5 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          + Tambah
        </button>
      </form>
      {(dupError || err) && (
        <p className="mt-2 text-[11.5px] text-danger">{dupError || (err as Error).message}</p>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus kategori"
        message={deleteMessage}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </Card>
  )
}

export default function KategoriTab() {
  const ing = useIngredientCategories()
  const menu = useMenuCategories()
  const methods = usePaymentMethods()
  const statuses = usePaymentStatuses()

  if (ing.isLoading || menu.isLoading || methods.isLoading || statuses.isLoading) return <LoadingRows />
  const err = ing.error || menu.error || methods.error || statuses.error
  if (err) return <ErrorState message={(err as Error).message} />

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AddableCategoryCard
        title="Kategori Bahan Baku"
        subtitle="Dipakai di Supplier & Pembelian"
        items={ing.data}
        table="ingredient_categories"
      />
      <AddableCategoryCard
        title="Kategori Menu"
        subtitle="Mengelompokkan Menu & Harga Jual"
        items={menu.data}
        table="menu_categories"
      />
      <Card title="Metode Pembayaran" subtitle="Referensi transaksi (read-only)">
        <ChipRow items={(methods.data ?? []).map((m) => ({ name: m.name }))} />
      </Card>
      <Card title="Status Pembayaran" subtitle="Warna badge mengikuti jenis status">
        <ChipRow
          items={(statuses.data ?? []).map((s) => ({
            name: s.name,
            tone: s.kind,
          }))}
        />
      </Card>
    </div>
  )
}
