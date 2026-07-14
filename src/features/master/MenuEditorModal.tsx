import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend } from '@/components/ui/Field'
import { MarginBadge, marginNote } from '@/components/ui/Badge'
import { formatRupiah, formatPercentInt } from '@/lib/format'
import { SATUAN_OPTIONS, type IngredientDraft, type MarginHealth, type MenuCategory, type MenuItemView, type Satuan } from '@/lib/db'
import { fetchIngredients, useSaveMenuItem } from './api'

interface Props {
  open: boolean
  onClose: () => void
  categories: MenuCategory[]
  /** Item being edited, or null for a new item. */
  item: MenuItemView | null
  /** Pre-selected category when adding from a category group. */
  defaultCategoryId?: string
}

// Seed ingredient rows from a composition string when a recipe hasn't been
// entered yet — mirrors the prototype's descToBahan (drops garnish-only items).
function descToDrafts(desc: string): IngredientDraft[] {
  return (desc || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && !/^(alat makan|sambal|sambel|lalapan|hiasan)/i.test(x))
    .map((name) => ({ name, qty: '1', unit: 'porsi' as Satuan, price: '' }))
}

function healthOf(margin: number, hasRows: boolean, price: number): MarginHealth {
  if (!hasRows) return 'none'
  if (price <= 0) return 'red'
  if (margin >= 0.5) return 'green'
  if (margin >= 0.35) return 'amber'
  return 'red'
}

export default function MenuEditorModal({ open, onClose, categories, item, defaultCategoryId }: Props) {
  const save = useSaveMenuItem()
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [rows, setRows] = useState<IngredientDraft[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // Reset / seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (!open) return
    setName(item?.name ?? '')
    setDesc(item?.description ?? '')
    setPrice(item ? String(item.sell_price) : '')
    setCategoryId(item?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '')
    setRows([])
    if (item) {
      setLoadingRecipe(true)
      fetchIngredients(item.id)
        .then((ings) => {
          setRows(
            ings.length
              ? ings.map((i) => ({ id: i.id, name: i.name, qty: String(i.qty), unit: i.unit, price: String(i.price) }))
              : descToDrafts(item.description ?? ''),
          )
        })
        .finally(() => setLoadingRecipe(false))
    } else {
      setRows([{ name: '', qty: '1', unit: 'porsi', price: '' }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const hpp = useMemo(
    () => rows.reduce((t, r) => t + (Number(r.qty) || 0) * (Number(r.price) || 0), 0),
    [rows],
  )
  const priceNum = Number(price) || 0
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? ''
  const hasRows = rows.some((r) => r.name.trim())
  const laba = priceNum - hpp
  const margin = priceNum > 0 ? laba / priceNum : 0
  const health = healthOf(margin, hasRows, priceNum)

  const setRow = (i: number, patch: Partial<IngredientDraft>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { name: '', qty: '1', unit: 'porsi', price: '' }])
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i))

  const submit = () => {
    if (!name.trim() || !categoryId || save.isPending) return
    save.mutate(
      {
        id: item?.id,
        category_id: categoryId,
        name,
        description: desc,
        sell_price: priceNum,
        ingredients: rows,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={item ? 'Edit Menu' : 'Tambah Menu'}
      subtitle="Isi resep untuk menghitung HPP & margin otomatis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !name.trim() || !categoryId}>
            {save.isPending ? 'Menyimpan…' : 'Simpan Menu'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <InputLegend />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Kategori terkunci — ditentukan dari kategori tempat menu ditambahkan. */}
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label className="text-[12px] font-semibold text-ink-body">Kategori Menu</label>
              <span className="text-[10.5px] text-ink-faint">terkunci</span>
            </div>
            <div className="field-master flex h-11 items-center justify-between rounded-field px-3">
              <span className="truncate text-[14px] font-semibold text-master">
                {categoryName || '—'}
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-master/70">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
          </div>
          <Field
            label="Harga Jual / Porsi"
            prefix="Rp"
            variant="manual"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Masukkan Nominal"
          />
        </div>

        <Field
          label="Nama Sub-Menu"
          hint="turunan dari Kategori Menu"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ketik Nama Sub-Menu"
        />

        <div>
          <div className="mb-1 text-[12px] font-semibold text-ink-body">Komposisi / Isi</div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="Ketik Komposisi/Isi Menu"
            className="field-manual w-full rounded-field px-3 py-2 text-[13px] font-medium leading-relaxed outline-none"
          />
        </div>

        {/* Recipe editor */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px] font-extrabold text-ink">Resep HPP</div>
            <button
              type="button"
              onClick={addRow}
              className="rounded-btn border border-app-border bg-app-card px-2.5 py-1.5 text-[12px] font-bold text-brand hover:bg-app-panel"
            >
              + Bahan
            </button>
          </div>

          {loadingRecipe ? (
            <div className="py-6 text-center text-[12px] text-ink-muted">Memuat resep…</div>
          ) : (
            <div className="cb-scroll max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {rows.map((r, i) => {
                const sub = (Number(r.qty) || 0) * (Number(r.price) || 0)
                return (
                  <div key={i} className="grid grid-cols-[1fr_60px_74px_1fr_auto] items-center gap-2">
                    <input
                      value={r.name}
                      onChange={(e) => setRow(i, { name: e.target.value })}
                      placeholder="Nama bahan"
                      className="field-manual h-10 rounded-field px-2.5 text-[13px] font-semibold outline-none"
                    />
                    <input
                      value={r.qty}
                      onChange={(e) => setRow(i, { qty: e.target.value.replace(/[^\d.]/g, '') })}
                      inputMode="decimal"
                      placeholder="Qty"
                      className="field-manual h-10 rounded-field px-2 text-center text-[13px] font-semibold outline-none"
                    />
                    <select
                      value={r.unit}
                      onChange={(e) => setRow(i, { unit: e.target.value as Satuan })}
                      className="cb-select field-manual h-10 rounded-field pl-2 pr-6 text-[12px] font-semibold outline-none"
                    >
                      {SATUAN_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={r.price}
                        onChange={(e) => setRow(i, { price: e.target.value.replace(/[^\d]/g, '') })}
                        inputMode="numeric"
                        placeholder="Harga"
                        className="field-manual h-10 w-full rounded-field px-2.5 text-right text-[13px] font-semibold outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-[92px] text-right text-[12px] font-bold tabular-nums text-ink">
                        {formatRupiah(sub)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        aria-label="Hapus bahan"
                        className="rounded-md p-1 text-ink-muted hover:bg-danger-bg hover:text-danger"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {rows.length === 0 && (
                <div className="py-4 text-center text-[12px] text-ink-muted">
                  Belum ada bahan. Klik “+ Bahan”.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live totals */}
        <div className="grid grid-cols-3 gap-2 rounded-field border border-auto-border bg-auto-bg p-3">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Total HPP</div>
            <div className="mt-1 text-[15px] font-extrabold tabular-nums text-ink">{formatRupiah(hpp)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Laba / Porsi</div>
            <div className={`mt-1 text-[15px] font-extrabold tabular-nums ${laba < 0 ? 'text-danger' : 'text-ok'}`}>
              {formatRupiah(laba)}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Margin</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[15px] font-extrabold tabular-nums text-ink">
                {hasRows && priceNum > 0 ? formatPercentInt(margin) : '—'}
              </span>
              <MarginBadge health={health} label={marginNote(health)} />
            </div>
          </div>
        </div>

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
