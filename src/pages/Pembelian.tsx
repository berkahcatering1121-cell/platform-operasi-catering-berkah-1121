import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PhotoCell from '@/components/ui/PhotoCell'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { groupByMonth } from '@/lib/grouping'
import { useEmployees } from '@/features/master/api'
import { usePurchases, useDeletePurchase } from '@/features/purchases/api'
import PurchaseModal from '@/features/purchases/PurchaseModal'
import type { PurchaseView } from '@/lib/db'
import { useT } from '@/lib/i18n'

export default function Pembelian() {
  const { t } = useT()
  const purchases = usePurchases()
  const employees = useEmployees()
  const del = useDeletePurchase()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseView | null>(null)
  const [toDelete, setToDelete] = useState<PurchaseView | null>(null)

  const empName = useMemo(() => {
    const m = new Map((employees.data ?? []).map((e) => [e.id, e.name]))
    return (id: string | null) => (id ? (m.get(id) ?? '') : '')
  }, [employees.data])

  const groups = useMemo(
    () => groupByMonth(purchases.data ?? [], (r) => r.month_key),
    [purchases.data],
  )

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: PurchaseView) => {
    setEditing(p)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Pembelian Bahan Baku"
        subtitle="Transaksi dikelompokkan per bulan dengan subtotal otomatis."
        actions={<Button onClick={openAdd}>{t('+ Pembelian')}</Button>}
      />

      {purchases.isLoading ? (
        <LoadingRows />
      ) : purchases.error ? (
        <ErrorState message={(purchases.error as Error).message} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada transaksi pembelian. Tambah lewat tombol + Pembelian." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const subtotal = g.rows.reduce((t, r) => t + r.total, 0)
            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} transaksi`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Tanggal</th>
                        <th className={TH}>Bahan</th>
                        <th className={TH}>Supplier</th>
                        <th className={TH_R}>{t('Qty')}</th>
                        <th className={TH_R}>{t('Harga Satuan')}</th>
                        <th className={TH_R}>{t('Total')}</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Foto</th>
                        <th className={TH}>PIC</th>
                        <th className={TH_R}>{t('Aksi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.purchase_date)}</td>
                          <td className={TD}>
                            <div className="font-bold text-ink">{titleCase(r.material_name)}</div>
                            {r.category && <div className="text-[11px] text-ink-faint">{r.category}</div>}
                          </td>
                          <td className={TD}>{r.supplier_name ?? '—'}</td>
                          <td className={TD_R}>
                            {r.qty}
                            {r.unit ? ` ${r.unit}` : ''}
                          </td>
                          <td className={TD_R}>{formatRupiah(r.unit_price)}</td>
                          <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.total)}</td>
                          <td className={TD}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className={TD}>
                            <PhotoCell paths={r.photos} title={r.material_name} />
                          </td>
                          <td className={TD}>
                            {empName(r.pic_employee_id) || <span className="text-ink-faint">—</span>}
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
                        <td className={SUB_R} colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <PurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus pembelian "${toDelete?.material_name}" (${toDelete ? formatDate(toDelete.purchase_date) : ''})?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
