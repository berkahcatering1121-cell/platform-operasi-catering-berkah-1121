import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useDebts, useDeleteDebt } from '@/features/debts/api'
import DebtModal from '@/features/debts/DebtModal'
import type { DebtView } from '@/lib/db'

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  return (
    <div className="cb-card p-4">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div
        className={`mt-1 text-[21px] font-extrabold tracking-[-0.01em] tabular-nums ${
          tone === 'red' ? 'text-danger' : tone === 'green' ? 'text-ok' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export default function Hutang() {
  const debts = useDebts()
  const del = useDeleteDebt()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DebtView | null>(null)
  const [toDelete, setToDelete] = useState<DebtView | null>(null)

  const totals = useMemo(() => {
    const rows = debts.data ?? []
    return {
      total: rows.reduce((t, r) => t + r.amount, 0),
      paid: rows.reduce((t, r) => t + r.paid_amount, 0),
      sisa: rows.reduce((t, r) => t + r.sisa, 0),
    }
  }, [debts.data])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (d: DebtView) => {
    setEditing(d)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Hutang"
        subtitle="Sisa & status hutang dihitung otomatis (Lunas / Belum Lunas / Jatuh Tempo)."
        actions={<Button onClick={openAdd}>+ Hutang</Button>}
      />

      {debts.isLoading ? (
        <LoadingRows />
      ) : debts.error ? (
        <ErrorState message={(debts.error as Error).message} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Total Hutang" value={formatRupiah(totals.total)} />
            <SummaryCard label="Sudah Dibayar" value={formatRupiah(totals.paid)} tone="green" />
            <SummaryCard label="Total Sisa" value={formatRupiah(totals.sisa)} tone="red" />
          </div>

          <Card bodyClassName="">
            <div className="cb-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Tgl Hutang</th>
                    <th className={TH}>Kreditur</th>
                    <th className={TH}>Keterangan</th>
                    <th className={TH_R}>Jumlah</th>
                    <th className={TH}>Jatuh Tempo</th>
                    <th className={TH_R}>Sudah Dibayar</th>
                    <th className={TH_R}>Sisa</th>
                    <th className={TH}>Status</th>
                    <th className={TH_R}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.data && debts.data.length > 0 ? (
                    debts.data.map((r) => (
                      <tr key={r.id}>
                        <td className={TD + ' whitespace-nowrap'}>{formatDate(r.debt_date)}</td>
                        <td className={TD}>
                          <div className="font-bold text-ink">{titleCase(r.creditor)}</div>
                          {r.debt_type && <div className="text-[11px] text-ink-faint">{titleCase(r.debt_type)}</div>}
                        </td>
                        <td className={TD + ' max-w-[240px] truncate'} title={r.description ?? ''}>
                          {r.description ? titleCase(r.description) : '—'}
                        </td>
                        <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.amount)}</td>
                        <td className={TD + ' whitespace-nowrap'}>{formatDate(r.due_date)}</td>
                        <td className={TD_R}>{formatRupiah(r.paid_amount)}</td>
                        <td className={TD_R + ' font-bold ' + (r.sisa > 0 ? 'text-danger' : 'text-ink')}>
                          {formatRupiah(r.sisa)}
                        </td>
                        <td className={TD}>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className={TD_R}>
                          <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState message="Belum ada data hutang. Tambah lewat tombol + Hutang." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <DebtModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus hutang ke "${toDelete?.creditor}"?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
