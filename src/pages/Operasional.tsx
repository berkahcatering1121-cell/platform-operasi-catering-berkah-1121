import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PhotoCell from '@/components/ui/PhotoCell'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { groupByMonth } from '@/lib/grouping'
import { useOperationalCosts, useDeleteOpex } from '@/features/opex/api'
import OpexModal from '@/features/opex/OpexModal'
import type { OperationalCost } from '@/lib/db'
import { useT } from '@/lib/i18n'

export default function Operasional() {
  const { t } = useT()
  const opex = useOperationalCosts()
  const del = useDeleteOpex()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OperationalCost | null>(null)
  const [toDelete, setToDelete] = useState<OperationalCost | null>(null)

  const groups = useMemo(
    () => groupByMonth(opex.data ?? [], (r) => r.cost_date.slice(0, 7)),
    [opex.data],
  )

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (o: OperationalCost) => {
    setEditing(o)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Biaya Operasional"
        subtitle="Beban per kategori dengan foto nota; subtotal per bulan otomatis."
        actions={<Button onClick={openAdd}>{t('+ Biaya')}</Button>}
      />

      {opex.isLoading ? (
        <LoadingRows />
      ) : opex.error ? (
        <ErrorState message={(opex.error as Error).message} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada biaya operasional. Tambah lewat tombol + Biaya." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const subtotal = g.rows.reduce((t, r) => t + r.amount, 0)
            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} transaksi`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Tanggal</th>
                        <th className={TH}>Keterangan</th>
                        <th className={TH}>Kategori</th>
                        <th className={TH_R}>{t('Jumlah')}</th>
                        <th className={TH}>Metode</th>
                        <th className={TH}>Foto Nota</th>
                        <th className={TH}>Catatan</th>
                        <th className={TH_R}>{t('Aksi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.cost_date)}</td>
                          <td className={TD + ' font-bold text-ink'}>{titleCase(r.description)}</td>
                          <td className={TD}>
                            <Badge tone="neutral">{r.category}</Badge>
                          </td>
                          <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.amount)}</td>
                          <td className={TD}>{r.method ?? '—'}</td>
                          <td className={TD}>
                            <PhotoCell paths={r.photos} title={r.description} />
                          </td>
                          <td className={TD + ' max-w-[220px] truncate'} title={r.notes ?? ''}>
                            {r.notes ?? '—'}
                          </td>
                          <td className={TD_R}>
                            <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={SUB_L} colSpan={3}>
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

      <OpexModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus biaya "${toDelete?.description}" (${toDelete ? formatDate(toDelete.cost_date) : ''})?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
