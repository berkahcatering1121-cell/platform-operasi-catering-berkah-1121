import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah, formatDate } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useT } from '@/lib/i18n'
import { downloadCsv } from '@/lib/export'
import { readXlsxFirstSheet } from '@/lib/xlsxRead'
import { useDebts, useImportDebts } from './api'
import { mapDebtsGrid, parseDelimited, debtKey, DEBT_TEMPLATE } from './importDebts'

const YEAR = new Date().getFullYear()

export default function DebtImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const importer = useImportDebts()
  const debts = useDebts()
  const fileRef = useRef<HTMLInputElement>(null)
  const headerCb = useRef<HTMLInputElement>(null)
  const [grid, setGrid] = useState<string[][] | null>(null)
  const [markPaid, setMarkPaid] = useState(false)
  const [source, setSource] = useState('')
  const [paste, setPaste] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const result = useMemo(() => (grid ? mapDebtsGrid(grid, YEAR, { markPaid }) : null), [grid, markPaid])

  // Keys of debts already in the system, for duplicate detection.
  const existingKeys = useMemo(() => {
    const s = new Set<string>()
    for (const d of debts.data ?? []) s.add(debtKey({ debt_date: d.debt_date, creditor: d.creditor, amount: d.amount }))
    return s
  }, [debts.data])

  // Annotate each parsed row with duplicate + selectability status.
  const annotated = useMemo(() => {
    return (result?.rows ?? []).map((row) => {
      const dup = !!row.input && existingKeys.has(debtKey(row.input))
      return { row, dup, selectable: !!row.input && !dup }
    })
  }, [result, existingKeys])

  const selectableNos = useMemo(() => annotated.filter((a) => a.selectable).map((a) => a.row.rowNo), [annotated])
  const dupCount = annotated.filter((a) => a.dup).length
  const invalidCount = annotated.filter((a) => !a.row.input).length

  // Default: select every importable (valid + non-duplicate) row.
  useEffect(() => {
    setSelected(new Set(selectableNos))
  }, [selectableNos])

  const allSelected = selectableNos.length > 0 && selectableNos.every((n) => selected.has(n))
  const someSelected = selectableNos.some((n) => selected.has(n))
  useEffect(() => {
    if (headerCb.current) headerCb.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  const chosen = annotated.filter((a) => a.selectable && selected.has(a.row.rowNo)).map((a) => a.row.input!)

  const reset = () => {
    setGrid(null)
    setMarkPaid(false)
    setSource('')
    setPaste('')
    setErr('')
    setDone(0)
    setSelected(new Set())
    importer.reset()
  }
  const close = () => {
    reset()
    onClose()
  }

  const loadGrid = (g: string[][], src: string) => {
    setErr('')
    setDone(0)
    setGrid(g)
    setSource(src)
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setErr('')
    try {
      if (/\.xlsx$/i.test(f.name)) {
        loadGrid(await readXlsxFirstSheet(await f.arrayBuffer()), f.name)
      } else {
        loadGrid(parseDelimited(await f.text()), f.name)
      }
    } catch (e) {
      setGrid(null)
      setErr((e as Error).message)
    }
  }

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableNos))
  const toggleOne = (no: number) =>
    setSelected((prev) => {
      const s = new Set(prev)
      if (s.has(no)) s.delete(no)
      else s.add(no)
      return s
    })

  const doImport = () => {
    if (chosen.length === 0) return
    importer.mutate(chosen, { onSuccess: () => setDone(chosen.length) })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Impor Hutang dari Excel"
      subtitle="Unggah .xlsx atau .csv, atau tempel dari Excel. Pilih baris yang mau diimpor; duplikat dilewati."
      wide
      footer={
        <>
          <button onClick={close} className="rounded-btn px-3.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel">
            {done > 0 ? t('Tutup') : t('Batal')}
          </button>
          <button
            onClick={doImport}
            disabled={chosen.length === 0 || importer.isPending || done > 0 || debts.isLoading}
            className="rounded-btn bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {importer.isPending ? t('Mengimpor…') : `${t('Impor')} ${chosen.length} ${t('hutang')}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {done > 0 ? (
          <div className="rounded-field border p-4 text-center" style={{ background: '#E9F6EE', borderColor: '#BFE3CE' }}>
            <div className="text-[14px] font-extrabold text-ok">{done} {t('hutang berhasil diimpor.')}</div>
            <div className="mt-0.5 text-[12px] text-ink-body">{t('Data sudah masuk ke daftar hutang.')}</div>
          </div>
        ) : (
          <>
            {/* Input options */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                </svg>
                {t('Pilih file Excel / CSV')}
              </button>
              <button
                onClick={() => downloadCsv(DEBT_TEMPLATE, 'Template Hutang - Catering Berkah.csv')}
                className="inline-flex items-center gap-1.5 rounded-btn border border-app-border bg-app-card px-3 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
              >
                {t('Unduh template')}
              </button>
              {source && <span className="text-[12px] font-semibold text-ink-body">{source}</span>}
            </div>

            <div>
              <div className="mb-1 text-[11.5px] font-semibold text-ink-muted">{t('atau tempel dari Excel (salin sel lalu tempel)')}</div>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={'Tanggal\tKreditur\tJenis\tKeterangan\tJumlah\tJatuh Tempo\tSudah Dibayar'}
                rows={3}
                className="field-manual w-full rounded-field px-3 py-2 text-[12px] font-medium outline-none"
              />
              <button
                onClick={() => loadGrid(parseDelimited(paste), t('teks ditempel'))}
                disabled={!paste.trim()}
                className="mt-2 rounded-btn border border-app-border bg-app-card px-3 py-1.5 text-[12.5px] font-bold text-ink-secondary hover:bg-app-panel disabled:opacity-50"
              >
                {t('Baca teks')}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              {t('Kolom: Tanggal, Kreditur, Jenis, Keterangan, Jumlah, Jatuh Tempo, Sudah Dibayar. Wajib diisi: Tanggal, Kreditur, Jumlah.')}{' '}
              {t('Jika tidak ada kolom Kreditur, nama diambil otomatis dari Keterangan (mis. "TF KE ...").')}
            </p>

            {err && <p className="rounded-field bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">{err}</p>}

            {/* Options */}
            <label className="flex items-start gap-2.5 rounded-field border border-app-border bg-app-panel px-3 py-2.5">
              <input
                type="checkbox"
                checked={markPaid}
                onChange={(e) => setMarkPaid(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-brand"
              />
              <span className="text-[12px] leading-snug text-ink-body">
                <span className="font-bold text-ink">{t('Tandai semua sebagai Lunas')}</span>{' '}
                {t('(Sudah Dibayar = Jumlah, status Lunas). Berlaku bila file tidak punya kolom Sudah Dibayar.')}
              </span>
            </label>

            {/* Preview */}
            {result && (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <Badge tone="green">{selectableNos.length} {t('bisa diimpor')}</Badge>
                  {dupCount > 0 && <Badge tone="amber">{dupCount} {t('duplikat')}</Badge>}
                  {invalidCount > 0 && <Badge tone="red">{invalidCount} {t('bermasalah')}</Badge>}
                  <span className="ml-auto text-[11.5px] font-semibold text-ink-muted">{chosen.length} {t('dipilih')}</span>
                </div>
                {dupCount > 0 && (
                  <p className="mb-2 text-[11px] text-ink-muted">{t('Baris duplikat (sudah ada di sistem) tidak dapat dipilih.')}</p>
                )}
                <div className="cb-scroll max-h-[300px] overflow-auto rounded-field border border-app-border">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-app-panel">
                      <tr>
                        <th className={TH + ' w-10 text-center'}>
                          <input
                            ref={headerCb}
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            disabled={selectableNos.length === 0}
                            aria-label={t('Pilih semua')}
                            className="h-4 w-4 accent-brand align-middle"
                          />
                        </th>
                        <th className={TH + ' w-8'}>#</th>
                        <th className={TH}>{t('Tanggal')}</th>
                        <th className={TH}>{t('Kreditur')}</th>
                        <th className={TH_R}>{t('Jumlah')}</th>
                        <th className={TH}>{t('Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annotated.map(({ row: r, dup, selectable }) => (
                        <tr
                          key={r.rowNo}
                          className={!r.input ? 'bg-danger-bg/40' : dup ? 'bg-warn-bg/40' : ''}
                        >
                          <td className={TD + ' text-center'}>
                            <input
                              type="checkbox"
                              checked={selectable && selected.has(r.rowNo)}
                              onChange={() => toggleOne(r.rowNo)}
                              disabled={!selectable}
                              aria-label={`${t('Pilih baris')} ${r.rowNo}`}
                              className="h-4 w-4 accent-brand align-middle disabled:opacity-40"
                            />
                          </td>
                          <td className={TD + ' text-ink-faint tabular-nums'}>{r.rowNo}</td>
                          <td className={TD + ' whitespace-nowrap'}>
                            {r.input ? formatDate(r.input.debt_date) : r.raw[0] || '-'}
                          </td>
                          <td className={TD + ' font-semibold text-ink'}>{r.input ? titleCase(r.input.creditor) : r.raw[1] || '-'}</td>
                          <td className={TD_R + ' tabular-nums'}>{r.input ? formatRupiah(r.input.amount) : '-'}</td>
                          <td className={TD}>
                            {!r.input ? (
                              <span className="text-[11.5px] font-semibold text-danger">{r.errors.map((e) => t(e)).join(', ')}</span>
                            ) : dup ? (
                              <span className="text-[11.5px] font-semibold text-warn">{t('Duplikat (sudah ada)')}</span>
                            ) : (
                              <span className="text-[11.5px] font-semibold text-ok">{t('Valid')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importer.error && (
              <p className="rounded-field bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">
                {(importer.error as Error).message}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
