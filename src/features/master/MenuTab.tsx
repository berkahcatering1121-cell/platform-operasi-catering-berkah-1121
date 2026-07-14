import { useMemo, useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import RowActions from '@/components/ui/RowActions'
import { MarginBadge, marginNote } from '@/components/ui/Badge'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah, formatPercentInt } from '@/lib/format'
import { titleCase } from '@/lib/text'
import MenuEditorModal from './MenuEditorModal'
import { useDeleteMenuItem, useMenuCategories, useMenuItems } from './api'
import type { MenuItemView } from '@/lib/db'

export default function MenuTab() {
  const cats = useMenuCategories()
  const items = useMenuItems()
  const del = useDeleteMenuItem()

  const [editor, setEditor] = useState<{ item: MenuItemView | null; categoryId?: string } | null>(null)
  const [toDelete, setToDelete] = useState<MenuItemView | null>(null)

  const byCategory = useMemo(() => {
    const map = new Map<string, MenuItemView[]>()
    for (const it of items.data ?? []) {
      const arr = map.get(it.category_id) ?? []
      arr.push(it)
      map.set(it.category_id, arr)
    }
    return map
  }, [items.data])

  if (cats.isLoading || items.isLoading) return <LoadingRows />
  const err = cats.error || items.error
  if (err) return <ErrorState message={(err as Error).message} />

  const categories = cats.data ?? []

  return (
    <>
      <div className="mb-4">
        <p className="text-[12.5px] text-ink-muted">
          Satu tabel per kategori menu. Tekan “+ Menu” pada kategori untuk menambah sub-menu di dalamnya.
          HPP, laba, dan margin dihitung otomatis dari resep.
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const list = byCategory.get(cat.id) ?? []
          return (
            <Card
              key={cat.id}
              title={cat.name}
              subtitle={`${list.length} menu`}
              action={
                <Button variant="secondary" onClick={() => setEditor({ item: null, categoryId: cat.id })}>
                  + Menu
                </Button>
              }
              bodyClassName=""
            >
              <div className="cb-scroll overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Menu</th>
                      <th className={TH_R}>HPP / Porsi</th>
                      <th className={TH_R}>Harga Jual / Porsi</th>
                      <th className={TH_R}>Margin</th>
                      <th className={TH_R}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length > 0 ? (
                      list.map((m) => (
                        <tr key={m.id}>
                          <td className={TD} style={{ whiteSpace: 'normal', maxWidth: 520 }}>
                            <div className="font-bold text-ink">{titleCase(m.name)}</div>
                            {m.description && (
                              <div className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                                {titleCase(m.description)}
                              </div>
                            )}
                          </td>
                          <td className={TD_R}>
                            {m.ingredient_count > 0 ? (
                              <span className="font-bold text-ink">{formatRupiah(m.hpp)}</span>
                            ) : (
                              <span className="italic text-ink-faint">Belum diisi</span>
                            )}
                          </td>
                          <td className={TD_R + ' font-bold text-ink'}>{formatRupiah(m.sell_price)}</td>
                          <td className={TD_R}>
                            <div className="flex flex-col items-end gap-1">
                              <MarginBadge
                                health={m.margin_health}
                                label={m.margin_health === 'none' ? '—' : formatPercentInt(m.margin ?? 0)}
                              />
                              <span className="text-[10px] text-ink-faint">{marginNote(m.margin_health)}</span>
                            </div>
                          </td>
                          <td className={TD_R}>
                            <RowActions
                              onEdit={() => setEditor({ item: m })}
                              onDelete={() => setToDelete(m)}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState message="Belum ada menu di kategori ini." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
        {categories.length === 0 && (
          <Card>
            <EmptyState message="Belum ada kategori menu. Tambahkan di tab Kategori & Referensi." />
          </Card>
        )}
      </div>

      <MenuEditorModal
        open={!!editor}
        onClose={() => setEditor(null)}
        categories={categories}
        item={editor?.item ?? null}
        defaultCategoryId={editor?.categoryId}
      />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus menu "${toDelete?.name}" beserta resepnya?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
