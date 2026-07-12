import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { useAssets, useDeleteAsset } from '@/features/assets/api'
import AssetModal from '@/features/assets/AssetModal'
import type { AssetView } from '@/lib/db'

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="cb-card p-4">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div className="mt-1 text-[19px] font-extrabold tracking-[-0.01em] tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-faint">{sub}</div>}
    </div>
  )
}

export default function Aset() {
  const assets = useAssets()
  const del = useDeleteAsset()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssetView | null>(null)
  const [toDelete, setToDelete] = useState<AssetView | null>(null)

  const totals = useMemo(() => {
    const rows = assets.data ?? []
    const active = rows.filter((r) => r.months_elapsed < r.economic_life_months)
    return {
      cost: rows.reduce((t, r) => t + r.acquisition_cost, 0),
      accum: rows.reduce((t, r) => t + r.accumulated_depreciation, 0),
      book: rows.reduce((t, r) => t + r.book_value, 0),
      monthly: active.reduce((t, r) => t + r.dep_per_month, 0),
    }
  }, [assets.data])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (a: AssetView) => {
    setEditing(a)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Aset & Depresiasi"
        subtitle="Depresiasi garis lurus; beban mengalir otomatis ke P&L."
        actions={<Button onClick={openAdd}>+ Aset</Button>}
      />

      {assets.isLoading ? (
        <LoadingRows />
      ) : assets.error ? (
        <ErrorState message={(assets.error as Error).message} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total Perolehan" value={formatRupiah(totals.cost)} />
            <SummaryCard label="Akumulasi Depresiasi" value={formatRupiah(totals.accum)} />
            <SummaryCard label="Nilai Buku" value={formatRupiah(totals.book)} />
            <SummaryCard label="Beban Depresiasi / Bulan" value={formatRupiah(totals.monthly)} sub="aset masih aktif" />
          </div>

          <Card bodyClassName="">
            <div className="cb-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Tgl Perolehan</th>
                    <th className={TH}>Nama Aset</th>
                    <th className={TH_R}>Harga Perolehan</th>
                    <th className={TH_R}>Umur</th>
                    <th className={TH_R}>Nilai Residu</th>
                    <th className={TH_R}>Depresiasi / Bulan</th>
                    <th className={TH_R}>Akum. Depresiasi</th>
                    <th className={TH_R}>Nilai Buku</th>
                    <th className={TH}>Status</th>
                    <th className={TH_R}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.data && assets.data.length > 0 ? (
                    assets.data.map((r) => {
                      const habis = r.months_elapsed >= r.economic_life_months
                      return (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.acquisition_date)}</td>
                          <td className={TD}>
                            <div className="font-bold text-ink">{r.name}</div>
                            {r.category && <div className="text-[11px] text-ink-faint">{r.category}</div>}
                          </td>
                          <td className={TD_R + ' font-bold text-ink'}>{formatRupiah(r.acquisition_cost)}</td>
                          <td className={TD_R}>{r.economic_life_months} bln</td>
                          <td className={TD_R}>{formatRupiah(r.residual_value)}</td>
                          <td className={TD_R}>{formatRupiah(r.dep_per_month)}</td>
                          <td className={TD_R}>{formatRupiah(r.accumulated_depreciation)}</td>
                          <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.book_value)}</td>
                          <td className={TD}>
                            <Badge tone={habis ? 'neutral' : 'green'}>{habis ? 'Habis' : 'Aktif'}</Badge>
                          </td>
                          <td className={TD_R}>
                            <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState message="Belum ada aset. Tambah lewat tombol + Aset." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <AssetModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus aset "${toDelete?.name}"?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
