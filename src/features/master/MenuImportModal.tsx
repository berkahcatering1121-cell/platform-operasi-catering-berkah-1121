import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah, formatPercentInt } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useT } from '@/lib/i18n'
import { readXlsxAllSheets } from '@/lib/xlsxRead'
import { parseHppWorkbook, hppDescription, type HppMenu } from './importHpp'
import { useImportMenuItems, type MenuItemSaveInput } from './api'
import type { MenuCategory, MenuItemView } from '@/lib/db'

interface Props {
  open: boolean
  onClose: () => void
  categories: MenuCategory[]
  existingItems: MenuItemView[]
}

export default function MenuImportModal({ open, onClose, categories, existingItems }: Props) {
  const { t } = useT()
  const importer = useImportMenuItems()
  const fileRef = useRef<HTMLInputElement>(null)
  const [categoryId, setCategoryId] = useState('')
  const [menus, setMenus] = useState<HppMenu[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [source, setSource] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (open) {
      setCategoryId((c) => c || categories[0]?.id || '')
      setMenus(null)
      setSelected(new Set())
      setSource('')
      setErr('')
      setDone(0)
      importer.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Existing menu names in the chosen category -> their id, for upsert matching.
  const existingByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of existingItems) if (it.category_id === categoryId) m.set(it.name.trim().toLowerCase(), it.id)
    return m
  }, [existingItems, categoryId])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setErr('')
    try {
      const parsed = parseHppWorkbook(await readXlsxAllSheets(await f.arrayBuffer()))
      if (parsed.length === 0) {
        setMenus(null)
        setErr(t('Tidak ada menu HPP yang terbaca di file ini.'))
        return
      }
      setMenus(parsed)
      setSource(f.name)
      setSelected(new Set(parsed.filter((m) => m.valid).map((m) => m.sheet)))
      setDone(0)
    } catch (e) {
      setMenus(null)
      setErr((e as Error).message)
    }
  }

  const toggle = (sheet: string) =>
    setSelected((prev) => {
      const s = new Set(prev)
      if (s.has(sheet)) s.delete(sheet)
      else s.add(sheet)
      return s
    })

  const chosen = (menus ?? []).filter((m) => m.valid && selected.has(m.sheet))

  const inputs: MenuItemSaveInput[] = chosen.map((m) => ({
    id: existingByName.get(m.name.trim().toLowerCase()),
    category_id: categoryId,
    name: m.name,
    description: hppDescription(m),
    sell_price: m.sellPrice,
    ingredients: m.recipe,
  }))

  const doImport = () => {
    if (inputs.length === 0 || !categoryId) return
    importer.mutate(inputs, { onSuccess: () => setDone(inputs.length) })
  }

  const catName = categories.find((c) => c.id === categoryId)?.name ?? ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Impor HPP Menu dari Excel"
      subtitle="Unggah file HPP Catering (.xlsx). Tiap sheet menjadi satu menu dengan HPP & harga jual sesuai dokumen."
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-btn px-3.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
          >
            {done > 0 ? t('Tutup') : t('Batal')}
          </button>
          <button
            onClick={doImport}
            disabled={inputs.length === 0 || importer.isPending || done > 0 || !categoryId}
            className="rounded-btn bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {importer.isPending ? t('Mengimpor…') : `${t('Impor')} ${inputs.length} ${t('menu')}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {done > 0 ? (
          <div className="rounded-field border p-4 text-center" style={{ background: '#E9F6EE', borderColor: '#BFE3CE' }}>
            <div className="text-[14px] font-extrabold text-ok">
              {done} {t('menu berhasil diimpor ke kategori')} “{catName}”.
            </div>
            <div className="mt-0.5 text-[12px] text-ink-body">
              {t('HPP, resep ringkas, dan harga jual sudah diperbarui sesuai dokumen Excel.')}
            </div>
          </div>
        ) : (
          <>
            {/* Target category */}
            <div>
              <div className="mb-1 text-[11.5px] font-semibold text-ink-muted">{t('Kategori tujuan')}</div>
              {categories.length === 0 ? (
                <p className="rounded-field bg-warn-bg px-3 py-2 text-[12px] font-semibold text-warn">
                  {t('Belum ada kategori menu. Tambahkan dulu di tab Kategori & Referensi.')}
                </p>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="cb-select field-master h-11 w-full rounded-field pl-3 pr-8 text-[14px] font-semibold text-master outline-none sm:w-[320px]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* File picker */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
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
                {t('Pilih file HPP (.xlsx)')}
              </button>
              {source && <span className="text-[12px] font-semibold text-ink-body">{source}</span>}
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              {t('Harga jual diambil dari kolom "Harga jual/porsi" di tiap sheet. Menu dengan nama sama di kategori ini akan diperbarui (bukan digandakan).')}
            </p>

            {err && <p className="rounded-field bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">{err}</p>}

            {/* Preview */}
            {menus && (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <Badge tone="green">{menus.filter((m) => m.valid).length} {t('menu terbaca')}</Badge>
                  {menus.some((m) => !m.valid) && (
                    <Badge tone="red">{menus.filter((m) => !m.valid).length} {t('bermasalah')}</Badge>
                  )}
                  <span className="ml-auto text-[11.5px] font-semibold text-ink-muted">{inputs.length} {t('dipilih')}</span>
                </div>
                <div className="cb-scroll max-h-[320px] overflow-auto rounded-field border border-app-border">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-app-panel">
                      <tr>
                        <th className={TH + ' w-10 text-center'}>✓</th>
                        <th className={TH}>{t('Menu')}</th>
                        <th className={TH_R}>{t('HPP / Porsi')}</th>
                        <th className={TH_R}>{t('Harga Jual')}</th>
                        <th className={TH_R}>{t('Margin')}</th>
                        <th className={TH}>{t('Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus.map((m) => {
                        const isUpdate = m.valid && existingByName.has(m.name.trim().toLowerCase())
                        const margin = m.sellPrice > 0 ? (m.sellPrice - m.totalHpp) / m.sellPrice : 0
                        return (
                          <tr key={m.sheet} className={!m.valid ? 'bg-danger-bg/40' : ''}>
                            <td className={TD + ' text-center'}>
                              <input
                                type="checkbox"
                                checked={m.valid && selected.has(m.sheet)}
                                onChange={() => toggle(m.sheet)}
                                disabled={!m.valid}
                                aria-label={`${t('Pilih')} ${m.name}`}
                                className="h-4 w-4 accent-brand align-middle disabled:opacity-40"
                              />
                            </td>
                            <td className={TD}>
                              <div className="font-bold text-ink">{titleCase(m.name)}</div>
                              <div className="text-[11px] text-ink-faint">{m.porsiLabel || `${m.porsiTotal} porsi`}</div>
                            </td>
                            <td className={TD_R + ' tabular-nums'}>{m.valid ? formatRupiah(m.totalHpp) : '-'}</td>
                            <td className={TD_R + ' font-bold tabular-nums text-ink'}>{m.valid ? formatRupiah(m.sellPrice) : '-'}</td>
                            <td className={TD_R + ' tabular-nums text-ink-muted'}>{m.valid ? formatPercentInt(margin) : '-'}</td>
                            <td className={TD}>
                              {!m.valid ? (
                                <span className="text-[11.5px] font-semibold text-danger">{m.issues.map((e) => t(e)).join(', ')}</span>
                              ) : isUpdate ? (
                                <span className="text-[11.5px] font-semibold text-warn">{t('Perbarui')}</span>
                              ) : (
                                <span className="text-[11.5px] font-semibold text-ok">{t('Baru')}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
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
