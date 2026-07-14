import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { groupByMonth } from '@/lib/grouping'
import { useEmployees } from '@/features/master/api'
import { useSales, useDeleteSale } from '@/features/sales/api'
import SaleModal from '@/features/sales/SaleModal'
import type { SaleView } from '@/lib/db'

export default function Penjualan() {
  const sales = useSales()
  const employees = useEmployees()
  const del = useDeleteSale()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SaleView | null>(null)
  const [toDelete, setToDelete] = useState<SaleView | null>(null)

  const empName = useMemo(() => {
    const m = new Map((employees.data ?? []).map((e) => [e.id, e.name]))
    return (id: string | null, fallback: string | null) =>
      id ? (m.get(id) ?? fallback ?? '') : (fallback ?? '')
  }, [employees.data])

  const groups = useMemo(() => groupByMonth(sales.data ?? [], (r) => r.month_key), [sales.data])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (s: SaleView) => {
    setEditing(s)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Penjualan"
        subtitle="Pesanan customer & event; harga per porsi ditarik dari Master Data."
        actions={<Button onClick={openAdd}>+ Penjualan</Button>}
      />

      {sales.isLoading ? (
        <LoadingRows />
      ) : sales.error ? (
        <ErrorState message={(sales.error as Error).message} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada transaksi penjualan. Tambah lewat tombol + Penjualan." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const subtotal = g.rows.reduce((t, r) => t + r.total, 0)
            const subSisa = g.rows.reduce((t, r) => t + r.sisa, 0)
            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} transaksi`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Tanggal</th>
                        <th className={TH}>Customer / Event</th>
                        <th className={TH}>Menu</th>
                        <th className={TH_R}>Porsi</th>
                        <th className={TH_R}>Harga / Porsi</th>
                        <th className={TH_R}>Total</th>
                        <th className={TH_R}>Sisa Pembayaran</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>PIC</th>
                        <th className={TH_R}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.sale_date)}</td>
                          <td className={TD + ' font-bold text-ink'}>{titleCase(r.customer)}</td>
                          <td className={TD}>
                            <div>{r.menu_name ? titleCase(r.menu_name) : '—'}</div>
                            {r.menu_category && (
                              <div className="text-[11px] text-ink-faint">{r.menu_category}</div>
                            )}
                          </td>
                          <td className={TD_R}>{r.portions}</td>
                          <td className={TD_R}>{formatRupiah(r.price_per_portion)}</td>
                          <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.total)}</td>
                          <td className={TD_R}>
                            {r.status === 'Lunas' || r.sisa <= 0 ? (
                              <span className="text-ink-faint">—</span>
                            ) : (
                              <span className="font-bold text-danger">{formatRupiah(r.sisa)}</span>
                            )}
                          </td>
                          <td className={TD}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className={TD}>
                            {empName(r.pic_employee_id, r.pic_name) || <span className="text-ink-faint">—</span>}
                          </td>
                          <td className={TD_R}>
                            <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={SUB_L} colSpan={5}>
                          Subtotal {g.label}
                        </td>
                        <td className={SUB_R}>{formatRupiah(subtotal)}</td>
                        <td className={SUB_R}>{subSisa > 0 ? formatRupiah(subSisa) : '—'}</td>
                        <td className={SUB_R} colSpan={3} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <SaleModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus penjualan "${toDelete?.customer}" (${toDelete ? formatDate(toDelete.sale_date) : ''})?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
