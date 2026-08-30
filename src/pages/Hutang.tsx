import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah, formatMonthLabel } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useDebts, useDeleteDebt } from '@/features/debts/api'
import DebtModal from '@/features/debts/DebtModal'
import DebtImportModal from '@/features/debts/DebtImportModal'
import type { DebtView } from '@/lib/db'
import { useT } from '@/lib/i18n'

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
  const { t } = useT()
  const debts = useDebts()
  const del = useDeleteDebt()

  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<DebtView | null>(null)
  const [toDelete, setToDelete] = useState<DebtView | null>(null)
  const [month, setMonth] = useState('all') // 'all' or 'YYYY-MM' (by debt date)

  // Months present in the data, newest first, for the filter dropdown.
  const monthOptions = useMemo(() => {
    const set = new Set((debts.data ?? []).map((r) => (r.debt_date ?? '').slice(0, 7)).filter(Boolean))
    return [...set].sort((a, b) => (a > b ? -1 : 1))
  }, [debts.data])

  const rowsInScope = useMemo(() => {
    const rows = debts.data ?? []
    return month === 'all' ? rows : rows.filter((r) => (r.debt_date ?? '').startsWith(month))
  }, [debts.data, month])

  const totals = useMemo(() => {
    // "Sudah Dibayar" is capped at each debt's amount: paying more than the debt
    // (an over-entered row) must not inflate the paid total beyond Total Hutang.
    // This keeps the three cards consistent: Total Hutang = Sudah Dibayar + Sisa,
    // because min(paid, amount) + max(0, amount - paid) === amount for every row.
    return {
      total: rowsInScope.reduce((t, r) => t + r.amount, 0),
      paid: rowsInScope.reduce((t, r) => t + Math.min(r.paid_amount, r.amount), 0),
      sisa: rowsInScope.reduce((t, r) => t + r.sisa, 0),
    }
  }, [rowsInScope])

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
        actions={
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="cb-select h-[38px] rounded-btn border border-app-border bg-app-card pl-3 pr-8 text-[13px] font-bold text-ink-secondary outline-none hover:bg-app-panel"
              aria-label={t('Pilih bulan')}
            >
              <option value="all">{t('Semua Bulan')}</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(`${m}-01`)}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              {t('Impor Excel')}
            </Button>
            <Button onClick={openAdd}>{t('+ Hutang')}</Button>
          </div>
        }
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
                    <th className={TH_R}>{t('Jumlah')}</th>
                    <th className={TH}>Jatuh Tempo</th>
                    <th className={TH_R}>{t('Sudah Dibayar')}</th>
                    <th className={TH_R}>{t('Sisa')}</th>
                    <th className={TH}>Status</th>
                    <th className={TH_R}>{t('Aksi')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsInScope.length > 0 ? (
                    rowsInScope.map((r) => (
                      <tr key={r.id}>
                        <td className={TD + ' whitespace-nowrap'}>{formatDate(r.debt_date)}</td>
                        <td className={TD}>
                          <div className="font-bold text-ink">{titleCase(r.creditor)}</div>
                          {r.debt_type && <div className="text-[11px] text-ink-faint">{titleCase(r.debt_type)}</div>}
                        </td>
                        <td className={TD + ' max-w-[240px] truncate'} title={r.description ?? ''}>
                          {r.description ? titleCase(r.description) : '-'}
                        </td>
                        <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.amount)}</td>
                        <td className={TD + ' whitespace-nowrap'}>{formatDate(r.due_date)}</td>
                        <td className={TD_R}>{formatRupiah(Math.min(r.paid_amount, r.amount))}</td>
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
                        <EmptyState
                          message={
                            month === 'all'
                              ? t('Belum ada data hutang. Tambah lewat tombol + Hutang.')
                              : t('Tidak ada hutang pada bulan ini.')
                          }
                        />
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
      <DebtImportModal open={importOpen} onClose={() => setImportOpen(false)} />

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
