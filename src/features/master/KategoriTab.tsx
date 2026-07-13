import { useState } from 'react'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  useAddRefCategory,
  useIngredientCategories,
  useMenuCategories,
  usePaymentMethods,
  usePaymentStatuses,
} from './api'
import type { RefRow } from '@/lib/db'

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

function AddableCategoryCard({
  title,
  subtitle,
  items,
  table,
}: {
  title: string
  subtitle: string
  items: RefRow[] | undefined
  table: 'ingredient_categories' | 'menu_categories'
}) {
  const [value, setValue] = useState('')
  const add = useAddRefCategory(table)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = value.trim()
    if (!name || add.isPending) return
    add.mutate(name, { onSuccess: () => setValue('') })
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="mb-3">
        {items && items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((c) => (
              <Badge key={c.id} tone="green">
                {c.name}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-ink-muted">Belum ada kategori.</div>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
      {add.isError && <p className="mt-2 text-[11.5px] text-danger">{(add.error as Error).message}</p>}
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
