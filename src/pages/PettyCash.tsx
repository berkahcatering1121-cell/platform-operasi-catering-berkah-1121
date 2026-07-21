import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PhotoCell from '@/components/ui/PhotoCell'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah, formatMonthLabel } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useAuth } from '@/auth/AuthProvider'
import {
  usePettyPeriods,
  usePettyEntries,
  useDeletePeriod,
  useDeleteEntry,
  useSetSettle,
} from '@/features/petty/api'
import PeriodModal from '@/features/petty/PeriodModal'
import EntryModal from '@/features/petty/EntryModal'
import type { PettyEntryView, PettyPeriod } from '@/lib/db'
import { useT } from '@/lib/i18n'

export default function PettyCash() {
  const { t } = useT()
  const { canSettle } = useAuth()
  const periods = usePettyPeriods()
  const entries = usePettyEntries()
  const delPeriod = useDeletePeriod()
  const delEntry = useDeleteEntry()
  const setSettle = useSetSettle()

  const [periodModal, setPeriodModal] = useState<{ open: boolean; editing: PettyPeriod | null }>({
    open: false,
    editing: null,
  })
  const [entryModal, setEntryModal] = useState<{
    open: boolean
    periodId: string
    periodMonth: string
    editing: PettyEntryView | null
  }>({ open: false, periodId: '', periodMonth: '', editing: null })
  const [periodToDelete, setPeriodToDelete] = useState<PettyPeriod | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<PettyEntryView | null>(null)

  const entriesByPeriod = useMemo(() => {
    const map = new Map<string, PettyEntryView[]>()
    for (const e of entries.data ?? []) {
      const arr = map.get(e.period_id) ?? []
      arr.push(e)
      map.set(e.period_id, arr)
    }
    return map
  }, [entries.data])

  const loading = periods.isLoading || entries.isLoading
  const error = periods.error || entries.error

  return (
    <>
      <PageHeader
        title="Petty Cash"
        subtitle="Kas kecil dengan saldo berjalan otomatis dan status settle per bulan."
        actions={<Button onClick={() => setPeriodModal({ open: true, editing: null })}>+ Periode</Button>}
      />

      {loading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : (periods.data ?? []).length === 0 ? (
        <Card>
          <EmptyState message="Belum ada periode kas kecil. Buat lewat tombol + Periode." />
        </Card>
      ) : (
        <div className="space-y-4">
          {(periods.data ?? []).map((p) => {
            const rows = entriesByPeriod.get(p.id) ?? []
            const totalIn = rows.reduce((t, r) => t + r.cash_in, 0)
            const totalOut = rows.reduce((t, r) => t + r.cash_out, 0)
            const saldoAkhir = rows.length ? rows[rows.length - 1].running_balance : p.opening_balance
            const monthKey = p.period_month.slice(0, 7)
            return (
              <div key={p.id} className="cb-card overflow-hidden">
                {/* Period header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[13.5px] font-extrabold text-ink">{formatMonthLabel(p.period_month)}</span>
                    <span className="text-[11.5px] text-ink-muted">
                      Saldo Awal <b className="text-ink-body">{formatRupiah(p.opening_balance)}</b>
                    </span>
                    {canSettle ? (
                      <button
                        onClick={() => setSettle.mutate({ id: p.id, is_settled: !p.is_settled })}
                        disabled={setSettle.isPending}
                        title={p.is_settled ? 'Klik untuk batalkan settle' : 'Approve settle (tim Finance)'}
                        className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[11px] font-extrabold transition disabled:opacity-60 ${
                          p.is_settled
                            ? 'border-ok-border bg-ok-bg text-ok-text hover:brightness-95'
                            : 'border-gold-border bg-gold-tint text-gold-text hover:bg-gold-pale'
                        }`}
                      >
                        {p.is_settled ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Settle
                          </>
                        ) : (
                          'Tandai Settle'
                        )}
                      </button>
                    ) : (
                      <StatusBadge status={p.is_settled ? 'Settle' : 'Not Settle Yet'} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEntryModal({ open: true, periodId: p.id, periodMonth: monthKey, editing: null })
                      }
                    >
                      + Transaksi
                    </Button>
                    <RowActions
                      onEdit={() => setPeriodModal({ open: true, editing: p })}
                      onDelete={() => setPeriodToDelete(p)}
                    />
                  </div>
                </div>

                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Tanggal</th>
                        <th className={TH}>Keterangan</th>
                        <th className={TH}>Foto Bukti</th>
                        <th className={TH_R}>{t('Masuk', 'In')}</th>
                        <th className={TH_R}>{t('Keluar', 'Out')}</th>
                        <th className={TH_R}>{t('Saldo')}</th>
                        <th className={TH_R}>{t('Aksi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState message="Belum ada transaksi pada periode ini." />
                          </td>
                        </tr>
                      )}
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.entry_date)}</td>
                          <td className={TD + ' font-bold text-ink'}>{titleCase(r.description)}</td>
                          <td className={TD}>
                            <PhotoCell paths={r.photos} title={r.description} />
                          </td>
                          <td className={TD_R + (r.cash_in ? ' font-bold text-ok' : ' text-ink-faint')}>
                            {r.cash_in ? formatRupiah(r.cash_in) : '—'}
                          </td>
                          <td className={TD_R + (r.cash_out ? ' font-bold text-danger' : ' text-ink-faint')}>
                            {r.cash_out ? formatRupiah(r.cash_out) : '—'}
                          </td>
                          <td className={TD_R + ' font-bold text-ink'}>{formatRupiah(r.running_balance)}</td>
                          <td className={TD_R}>
                            <RowActions
                              onEdit={() =>
                                setEntryModal({ open: true, periodId: p.id, periodMonth: monthKey, editing: r })
                              }
                              onDelete={() => setEntryToDelete(r)}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={SUB_L} colSpan={3}>
                          Subtotal · Saldo Akhir
                        </td>
                        <td className={SUB_R}>{formatRupiah(totalIn)}</td>
                        <td className={SUB_R}>{formatRupiah(totalOut)}</td>
                        <td className={SUB_R}>{formatRupiah(saldoAkhir)}</td>
                        <td className={SUB_R} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PeriodModal
        open={periodModal.open}
        editing={periodModal.editing}
        onClose={() => setPeriodModal({ open: false, editing: null })}
      />
      <EntryModal
        open={entryModal.open}
        periodId={entryModal.periodId}
        periodMonth={entryModal.periodMonth}
        editing={entryModal.editing}
        onClose={() => setEntryModal({ open: false, periodId: '', periodMonth: '', editing: null })}
      />

      <ConfirmDialog
        open={!!periodToDelete}
        title="Hapus periode kas"
        message={`Hapus periode ${periodToDelete ? formatMonthLabel(periodToDelete.period_month) : ''} beserta semua transaksinya?`}
        busy={delPeriod.isPending}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={() => periodToDelete && delPeriod.mutate(periodToDelete.id, { onSuccess: () => setPeriodToDelete(null) })}
      />
      <ConfirmDialog
        open={!!entryToDelete}
        message={`Hapus transaksi "${entryToDelete?.description}"?`}
        busy={delEntry.isPending}
        onClose={() => setEntryToDelete(null)}
        onConfirm={() => entryToDelete && delEntry.mutate(entryToDelete.id, { onSuccess: () => setEntryToDelete(null) })}
      />
    </>
  )
}
