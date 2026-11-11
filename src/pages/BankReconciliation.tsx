import { useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah, formatDate, months as monthNames } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useT } from '@/lib/i18n'
import { useCashFlow } from '@/features/cashflow/api'
import { useSaveOpex } from '@/features/opex/api'
import { OPEX_CATEGORIES } from '@/lib/db'
import { parseBcaStatement, type BcaParseResult } from '@/features/reconciliation/parseBca'
import { parseBcaPdf } from '@/features/reconciliation/parseBcaPdf'
import {
  getBankSummary,
  saveBankSummary,
  deleteBankSummary,
  type BankMonthSummary,
} from '@/features/reconciliation/bankSummary'
import {
  useBankTxns,
  useSaveBankTxns,
  useMarkBankTxnRecorded,
  useDeleteBankTxnsForMonth,
  type BankTxnRow,
  type BankTxnInsert,
} from '@/features/reconciliation/api'
import { extractPdfText } from '@/lib/pdfText'

const TODAY = new Date()

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone?: 'green' | 'red' | 'gold'
  hint?: string
}) {
  const color = tone === 'green' ? 'text-ok' : tone === 'red' ? 'text-danger' : tone === 'gold' ? 'text-gold-text' : 'text-ink'
  return (
    <div className="cb-card p-4">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div className={`mt-1 text-[19px] font-extrabold tabular-nums tracking-[-0.01em] ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-faint">{hint}</div>}
    </div>
  )
}

// A persisted bank transaction paired with its match state against the ledger.
interface Reconciled extends BankTxnRow {
  matched: boolean
}

// Stable key so re-uploading the same statement never duplicates rows.
function dedupKeyOf(tx: { date: string; direction: string; amount: number; balance: number | null; description: string }, acct: string) {
  return `${acct}|${tx.date}|${tx.direction}|${tx.amount}|${tx.balance ?? ''}|${tx.description}`
}

export default function BankReconciliation() {
  const { t } = useT()
  const { rows, isLoading, error } = useCashFlow()
  const saveOpex = useSaveOpex()

  const [year, setYear] = useState(TODAY.getFullYear())
  const [month, setMonth] = useState(TODAY.getMonth() + 1) // 1-12
  const [pasteText, setPasteText] = useState('')
  const [fileName, setFileName] = useState('')
  const [catFor, setCatFor] = useState<Record<string, string>>({}) // txn.id -> chosen category
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [savedTick, setSavedTick] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const mm = String(month).padStart(2, '0')
  const monthKey = `${year}-${mm}`
  const monthStart = `${year}-${mm}-01`
  const monthEnd = `${year}-${mm}-31`
  const inMonth = (d: string) => d >= monthStart && d <= monthEnd

  // Persisted bank mutations for the selected month (stored in the system).
  const bankTxnsQuery = useBankTxns(monthKey)
  const storedTxns = useMemo(() => bankTxnsQuery.data ?? [], [bankTxnsQuery.data])
  const saveBankTxns = useSaveBankTxns()
  const markRecorded = useMarkBankTxnRecorded()
  const clearMonth = useDeleteBankTxnsForMonth()

  // Saved bank-statement summary for the selected month (opening/closing).
  const bankSummary = useMemo<BankMonthSummary | null>(
    () => getBankSummary(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, savedTick],
  )

  // ── System side (from the Cash Flow ledger) ──
  const sys = useMemo(() => {
    let saldoAwal = 0
    let masuk = 0
    let keluar = 0
    for (const r of rows) {
      if (r.date < monthStart) saldoAwal += r.cashIn - r.cashOut
      else if (inMonth(r.date)) {
        masuk += r.cashIn
        keluar += r.cashOut
      }
    }
    return { saldoAwal, masuk, keluar, saldoAkhir: saldoAwal + masuk - keluar }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, year, month])

  const perubahan = sys.saldoAkhir - sys.saldoAwal

  // ── Bank side (from the persisted statement rows) ──
  const bank = useMemo(() => {
    const masuk = storedTxns.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
    const keluar = storedTxns.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
    return { masuk, keluar, saldoAwal: bankSummary?.opening ?? null, saldoAkhir: bankSummary?.closing ?? null }
  }, [storedTxns, bankSummary])

  // ── Match each bank transaction against a system ledger row ──
  const monthRows = useMemo(() => rows.filter((r) => inMonth(r.date)), [rows, year, month]) // eslint-disable-line react-hooks/exhaustive-deps
  const reconciled = useMemo<Reconciled[]>(() => {
    const used = new Set<string>()
    return storedTxns.map((tx) => {
      const target = Math.round(tx.amount)
      const hit = monthRows.find((r) => {
        if (used.has(r.id)) return false
        const val = tx.direction === 'in' ? r.cashIn : r.cashOut
        if (Math.round(val) !== target) return false
        const dd = Math.abs((Date.parse(r.date) - Date.parse(tx.txn_date)) / 864e5)
        return dd <= 4
      })
      if (hit) used.add(hit.id)
      return { ...tx, matched: !!hit }
    })
  }, [storedTxns, monthRows])

  const unmatched = reconciled.filter((r) => !r.matched && !r.recorded)
  const unmatchedOut = unmatched.filter((r) => r.direction === 'out')
  const matchedCount = reconciled.filter((r) => r.matched).length
  const recordedCount = storedTxns.filter((t) => t.recorded).length

  const hasBank = storedTxns.length > 0
  const selisihAkhir = bank.saldoAkhir != null ? bank.saldoAkhir - sys.saldoAkhir : null
  const monthLabel = `${monthNames()[month - 1]} ${year}`

  // Persist all parsed statement lines. month_key is derived in the DB from the
  // row's own date, so rows land in their correct month regardless of the picker.
  const persist = (res: BcaParseResult, name: string, acctLast4?: string) => {
    setWarnings(res.warnings)
    setFileName(name)
    const acct = acctLast4 ?? bankSummary?.accountLast4 ?? ''
    const inserts: BankTxnInsert[] = res.txns.map((tx) => ({
      txn_date: tx.date,
      description: tx.description,
      direction: tx.direction,
      amount: Math.round(tx.amount * 100) / 100,
      balance: tx.balance,
      month_key: tx.date.slice(0, 7),
      source: name,
      account_last4: acct || null,
      dedup_key: dedupKeyOf(tx, acct),
    }))
    if (inserts.length) saveBankTxns.mutate(inserts)
  }

  const doParse = (text: string, name: string) => {
    const res = parseBcaStatement(text, year)
    if (res.openingBalance != null && res.closingBalance != null) {
      saveBankSummary({
        monthKey,
        opening: res.openingBalance,
        closing: res.closingBalance,
        totalIn: res.totalIn,
        totalOut: res.totalOut,
        savedAt: new Date().toISOString(),
      })
      setSavedTick((n) => n + 1)
    }
    persist(res, name)
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setPdfError('')
    if (/\.pdf$/i.test(f.name)) {
      setPdfBusy(true)
      try {
        const text = await extractPdfText(await f.arrayBuffer())
        const { result, summary } = parseBcaPdf(text, year)
        if (!summary && result.txns.length === 0) {
          setPdfError('Ringkasan saldo tidak ditemukan di PDF ini. Pastikan ini file mutasi rekening BCA.')
          return
        }
        // Adopt the statement's own period + save its summary for the Dashboard.
        if (summary?.monthKey) {
          const [yy, mmn] = summary.monthKey.split('-')
          setYear(Number(yy))
          setMonth(Number(mmn))
          saveBankSummary(summary)
        } else if (summary) {
          saveBankSummary({ ...summary, monthKey })
        }
        setSavedTick((n) => n + 1)
        persist(result, f.name, summary?.accountLast4)
      } catch (e) {
        setPdfError((e as Error).message || 'Gagal membaca PDF.')
      } finally {
        setPdfBusy(false)
      }
      return
    }
    doParse(await f.text(), f.name)
  }

  // Record an unmatched OUT transaction as an operating cost, then mark the bank
  // row as recorded in the system so the state survives reloads.
  const record = (tx: Reconciled) => {
    const category = catFor[tx.id] ?? OPEX_CATEGORIES[OPEX_CATEGORIES.length - 1]
    saveOpex.mutate(
      {
        cost_date: tx.txn_date,
        description: tx.description,
        category,
        amount: Math.round(tx.amount),
        method: 'Transfer Bank',
        notes: 'Dicatat dari rekonsiliasi mutasi BCA',
        photos: [],
      },
      { onSuccess: () => markRecorded.mutate({ id: tx.id, recorded_cost_id: null }) },
    )
  }

  const clearStatement = () => {
    clearMonth.mutate(monthKey, {
      onSuccess: () => {
        deleteBankSummary(monthKey)
        setSavedTick((n) => n + 1)
        setFileName('')
        setWarnings([])
        setConfirmClear(false)
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Rekonsiliasi Bank"
        subtitle="Cocokkan mutasi rekening BCA dengan catatan sistem, dan lihat pertumbuhan saldo per bulan."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="cb-select h-[38px] rounded-btn border border-app-border bg-app-card pl-3 pr-8 text-[13px] font-bold text-ink-secondary outline-none hover:bg-app-panel"
              aria-label={t('Pilih bulan')}
            >
              {monthNames().map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
                aria-label={t('Tahun sebelumnya')}
              >
                ‹
              </button>
              <span className="min-w-[52px] text-center text-[14px] font-extrabold text-ink">{year}</span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
                aria-label={t('Tahun berikutnya')}
              >
                ›
              </button>
            </div>
          </div>
        }
      />

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : (
        <div className="cb-stagger space-y-4">
          {/* Saldo awal / akhir + growth (from the system ledger) */}
          <div>
            <div className="mb-2">
              <div className="text-[14px] font-extrabold text-ink">
                {t('Menurut Sistem')} <span className="text-[12.5px] font-semibold text-ink-muted">· {monthLabel}</span>
              </div>
              <div className="text-[11.5px] text-ink-muted">{t('Dihitung dari catatan transaksi di aplikasi (semua modul).')}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={`${t('Saldo Awal')} · ${monthLabel}`} value={formatRupiah(sys.saldoAwal)} hint={t('menurut sistem')} />
              <StatCard label={t('Total Uang Masuk')} value={formatRupiah(sys.masuk)} tone="green" />
              <StatCard label={t('Total Uang Keluar')} value={formatRupiah(sys.keluar)} tone="red" />
              <StatCard label={`${t('Saldo Akhir')} · ${monthLabel}`} value={formatRupiah(sys.saldoAkhir)} tone="gold" hint={t('menurut sistem')} />
            </div>
          </div>

          {/* Growth banner */}
          <div
            className="flex items-center gap-3 rounded-card border p-4"
            style={
              perubahan >= 0
                ? { background: '#E9F6EE', borderColor: '#BFE3CE' }
                : { background: '#FBECEB', borderColor: '#F5C6BD' }
            }
          >
            <span className={perubahan >= 0 ? 'text-ok' : 'text-danger'}>
              {perubahan >= 0 ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7l6 6 4-4 8 8M21 17v-5M21 17h-5" />
                </svg>
              )}
            </span>
            <div>
              <div className={`text-[13.5px] font-extrabold ${perubahan >= 0 ? 'text-ok' : 'text-danger'}`}>
                {perubahan >= 0 ? t('Uang bertambah') : t('Uang berkurang')} {formatRupiah(Math.abs(perubahan))}
              </div>
              <div className="text-[11.5px] text-ink-body">
                {t('Selisih Saldo Akhir dengan Saldo Awal')} {monthLabel}.
              </div>
            </div>
          </div>

          {/* Bank statement summary (opening/closing saved per month) */}
          {bankSummary && (
            <Card
              title={`${t('Ringkasan Bank (dari statement)')} · ${monthLabel}`}
              subtitle={
                bankSummary.accountLast4
                  ? `${t('Rekening BCA')} •••• ${bankSummary.accountLast4}`
                  : t('Angka resmi dari mutasi rekening bank')
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t('Saldo Awal Bank')} value={formatRupiah(bankSummary.opening)} />
                <StatCard label={t('Total Uang Masuk')} value={formatRupiah(bankSummary.totalIn)} tone="green" hint={bankSummary.inCount ? `${bankSummary.inCount} transaksi` : undefined} />
                <StatCard label={t('Total Uang Keluar')} value={formatRupiah(bankSummary.totalOut)} tone="red" hint={bankSummary.outCount ? `${bankSummary.outCount} transaksi` : undefined} />
                <StatCard label={t('Saldo Akhir Bank')} value={formatRupiah(bankSummary.closing)} tone="gold" />
              </div>
              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-field border p-3.5"
                style={
                  bankSummary.closing - bankSummary.opening >= 0
                    ? { background: '#E9F6EE', borderColor: '#BFE3CE' }
                    : { background: '#FBECEB', borderColor: '#F5C6BD' }
                }
              >
                <div className={`text-[13.5px] font-extrabold ${bankSummary.closing - bankSummary.opening >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {bankSummary.closing - bankSummary.opening >= 0 ? t('Saldo bank naik') : t('Saldo bank turun')}{' '}
                  {formatRupiah(Math.abs(bankSummary.closing - bankSummary.opening))}
                </div>
                <div className="text-[11.5px] font-semibold text-ink-muted">
                  {t('Selisih dengan sistem')}: {formatRupiah(bankSummary.closing - sys.saldoAkhir)}
                </div>
              </div>
            </Card>
          )}

          {/* Upload BCA statement */}
          <Card title={t('Unggah Mutasi Bank BCA')} subtitle={t('Unggah PDF mutasi rekening BCA (otomatis terbaca), file CSV, atau tempel teks mutasi. Semua baris tersimpan di sistem.')}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.csv,.txt"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={pdfBusy || saveBankTxns.isPending}
                  className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                  </svg>
                  {pdfBusy ? t('Membaca PDF…') : saveBankTxns.isPending ? t('Menyimpan…') : t('Pilih file PDF / CSV')}
                </button>
                {fileName && <span className="text-[12px] font-semibold text-ink-body">{fileName}</span>}
              </div>
              {pdfError && <p className="text-[11.5px] font-semibold text-danger">{t(pdfError)}</p>}

              <div className="text-[11.5px] font-semibold text-ink-muted">{t('atau tempel teks mutasi di sini')}</div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'05/08  KARTU DEBIT TOKO SAYUR  2.500.000,00 DB  47.500.000,00'}
                rows={3}
                className="field-manual w-full rounded-field px-3 py-2 text-[12.5px] font-medium outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doParse(pasteText, t('teks ditempel'))}
                  disabled={!pasteText.trim() || saveBankTxns.isPending}
                  className="rounded-btn border border-app-border bg-app-card px-3 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel disabled:opacity-50"
                >
                  {t('Baca & simpan teks')}
                </button>
                {hasBank && (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="rounded-btn px-3 py-2 text-[13px] font-bold text-danger hover:bg-danger-bg"
                  >
                    {t('Hapus mutasi bulan ini')}
                  </button>
                )}
              </div>
              {saveBankTxns.isError && (
                <p className="text-[11.5px] text-danger">{(saveBankTxns.error as Error).message}</p>
              )}
              {warnings.map((w, i) => (
                <p key={i} className="text-[11.5px] text-danger">{t(w)}</p>
              ))}
            </div>
          </Card>

          {bankTxnsQuery.isLoading ? (
            <LoadingRows />
          ) : !hasBank ? (
            <Card>
              <EmptyState message={t('Unggah atau tempel mutasi BCA untuk mulai mencocokkan dengan catatan sistem.')} />
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t('Saldo Awal Bank')} value={bank.saldoAwal != null ? formatRupiah(bank.saldoAwal) : '-'} />
                <StatCard label={t('Saldo Akhir Bank')} value={bank.saldoAkhir != null ? formatRupiah(bank.saldoAkhir) : '-'} tone="gold" />
                <StatCard
                  label={t('Selisih Saldo Akhir')}
                  value={selisihAkhir != null ? formatRupiah(selisihAkhir) : '-'}
                  tone={selisihAkhir == null ? undefined : Math.abs(selisihAkhir) < 1 ? 'green' : 'red'}
                  hint={t('bank - sistem')}
                />
                <StatCard
                  label={t('Transaksi cocok')}
                  value={`${matchedCount} / ${storedTxns.length}`}
                  tone={matchedCount === storedTxns.length ? 'green' : undefined}
                  hint={t('bank yang cocok dengan sistem')}
                />
              </div>

              {selisihAkhir != null && Math.abs(selisihAkhir) < 1 && unmatched.length === 0 && (
                <div className="rounded-card border p-3 text-[12.5px] font-bold text-ok" style={{ background: '#E9F6EE', borderColor: '#BFE3CE' }}>
                  {t('Cocok. Saldo bank dan catatan sistem sudah sesuai.')}
                </div>
              )}

              {/* Unmatched bank transactions to record */}
              <Card
                title={t('Transaksi Bank Belum Tercatat')}
                subtitle={t('Ada di mutasi bank tapi belum ada di sistem. Catat agar pengeluaran ikut terhitung.')}
                action={
                  <span className="flex-none whitespace-nowrap rounded-pill border border-app-border bg-app-panel px-3 py-1 text-[12px] font-extrabold text-ink-secondary">
                    {unmatched.length}
                  </span>
                }
                bodyClassName=""
              >
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>{t('Tanggal')}</th>
                        <th className={TH}>{t('Keterangan')}</th>
                        <th className={TH}>{t('Arah')}</th>
                        <th className={TH_R}>{t('Jumlah')}</th>
                        <th className={TH}>{t('Kategori')}</th>
                        <th className={TH_R}>{t('Aksi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatched.length > 0 ? (
                        unmatched.map((tx) => (
                          <tr key={tx.id}>
                            <td className={TD + ' whitespace-nowrap'}>{formatDate(tx.txn_date)}</td>
                            <td className={TD + ' font-bold text-ink'} style={{ whiteSpace: 'normal', maxWidth: 320 }}>
                              {titleCase(tx.description)}
                            </td>
                            <td className={TD}>
                              <Badge tone={tx.direction === 'in' ? 'green' : 'red'}>
                                {tx.direction === 'in' ? t('Masuk') : t('Keluar')}
                              </Badge>
                            </td>
                            <td className={TD_R + ' font-bold ' + (tx.direction === 'in' ? 'text-ok' : 'text-danger')}>
                              {formatRupiah(tx.amount)}
                            </td>
                            <td className={TD}>
                              {tx.direction === 'out' ? (
                                <select
                                  value={catFor[tx.id] ?? OPEX_CATEGORIES[OPEX_CATEGORIES.length - 1]}
                                  onChange={(e) => setCatFor((c) => ({ ...c, [tx.id]: e.target.value }))}
                                  className="cb-select h-9 rounded-btn border border-app-border bg-app-card pl-2.5 pr-7 text-[12px] font-semibold text-ink-secondary outline-none hover:bg-app-panel"
                                >
                                  {OPEX_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11.5px] text-ink-faint">{t('pemasukan (catat manual)')}</span>
                              )}
                            </td>
                            <td className={TD_R}>
                              {tx.direction === 'out' ? (
                                <button
                                  onClick={() => record(tx)}
                                  disabled={saveOpex.isPending || markRecorded.isPending}
                                  className="rounded-btn bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                                >
                                  {t('Catat')}
                                </button>
                              ) : (
                                <span className="text-ink-faint">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState message={t('Semua transaksi bank sudah cocok atau sudah dicatat.')} />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {saveOpex.error && <p className="px-4 py-2 text-[11.5px] text-danger">{(saveOpex.error as Error).message}</p>}
              </Card>

              {unmatchedOut.length === 0 && unmatched.length > 0 && (
                <p className="text-[11.5px] text-ink-muted">{t('Sisa transaksi adalah pemasukan; catat lewat modul terkait bila perlu.')}</p>
              )}

              {/* All persisted bank mutations for the month (proof they are stored) */}
              <Card
                title={t('Semua Mutasi Bank Tersimpan')}
                subtitle={t('Seluruh baris mutasi tersimpan permanen di sistem untuk bulan ini.')}
                action={
                  <span className="flex-none whitespace-nowrap rounded-pill border border-app-border bg-app-panel px-3 py-1 text-[12px] font-extrabold text-ink-secondary">
                    {storedTxns.length} · {recordedCount} {t('tercatat')}
                  </span>
                }
                bodyClassName=""
              >
                <div className="cb-scroll max-h-[380px] overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-app-panel">
                      <tr>
                        <th className={TH}>{t('Tanggal')}</th>
                        <th className={TH}>{t('Keterangan')}</th>
                        <th className={TH}>{t('Arah')}</th>
                        <th className={TH_R}>{t('Jumlah')}</th>
                        <th className={TH}>{t('Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciled.map((tx) => (
                        <tr key={tx.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(tx.txn_date)}</td>
                          <td className={TD} style={{ whiteSpace: 'normal', maxWidth: 320 }}>{titleCase(tx.description)}</td>
                          <td className={TD}>
                            <Badge tone={tx.direction === 'in' ? 'green' : 'red'}>
                              {tx.direction === 'in' ? t('Masuk') : t('Keluar')}
                            </Badge>
                          </td>
                          <td className={TD_R + ' font-bold ' + (tx.direction === 'in' ? 'text-ok' : 'text-danger')}>
                            {formatRupiah(tx.amount)}
                          </td>
                          <td className={TD}>
                            {tx.recorded ? (
                              <span className="text-[11.5px] font-semibold text-ok">{t('Tercatat')}</span>
                            ) : tx.matched ? (
                              <span className="text-[11.5px] font-semibold text-brand">{t('Cocok')}</span>
                            ) : (
                              <span className="text-[11.5px] font-semibold text-warn">{t('Belum')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        message={`${t('Hapus semua mutasi bank tersimpan untuk')} ${monthLabel}?`}
        busy={clearMonth.isPending}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearStatement}
      />
    </>
  )
}
