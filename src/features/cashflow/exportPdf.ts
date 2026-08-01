import { jsPDF } from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'
import { formatDate } from '@/lib/format'
import type { CashExportRow } from './exportSheet'

const GREEN: [number, number, number] = [16, 96, 63]
const INK: [number, number, number] = [40, 28, 21]
const OKC: [number, number, number] = [31, 122, 77]
const REDC: [number, number, number] = [179, 38, 30]
const GOLDTINT: [number, number, number] = [250, 244, 222]

const rp = (n: number) => (Math.round(n) === 0 ? '-' : Math.round(n).toLocaleString('id-ID'))

async function loadLogo(url: string, size = 160): Promise<string> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.fillStyle = `rgb(${GREEN[0]},${GREEN[1]},${GREEN[2]})`
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.92)
}

interface Opts {
  rows: CashExportRow[] // chronological (oldest first)
  totals: { cashIn: number; cashOut: number; net: number }
  filterLabel: string
  t: (id: string, en?: string) => string
  generatedAt: Date
}

export async function exportCashFlowPdf({ rows, totals, filterLabel, t, generatedAt }: Opts) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 12

  // ── Header band ──
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 24, 'F')
  try {
    doc.addImage(await loadLogo('/assets/app-icon.png'), 'JPEG', M, 4, 16, 16)
  } catch {
    /* logo optional */
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Catering Berkah 1121', M + 20, 11)
  doc.setTextColor(226, 199, 126)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(t('Arus Kas'), M + 20, 17)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(filterLabel, pageW - M, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 216, 207)
  doc.text(`${t('Dibuat')}: ${generatedAt.toLocaleDateString('id-ID')}`, pageW - M, 17, { align: 'right' })

  // ── Summary chips ──
  const chips: [string, number, [number, number, number]][] = [
    [t('Total Uang Masuk'), totals.cashIn, OKC],
    [t('Total Uang Keluar'), totals.cashOut, REDC],
    [t('Arus Kas Bersih'), totals.net, totals.net < 0 ? REDC : GREEN],
  ]
  let cx = M
  const chipW = (pageW - 2 * M - 8) / 3
  chips.forEach(([label, val, color]) => {
    doc.setDrawColor(230, 224, 213)
    doc.setFillColor(250, 249, 246)
    doc.roundedRect(cx, 28, chipW, 14, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(120, 110, 90)
    doc.text(label, cx + 3, 33)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...color)
    doc.text(`Rp ${rp(val)}`, cx + 3, 39)
    cx += chipW + 4
  })

  // ── Ledger table ──
  const head: RowInput[] = [
    [t('Tanggal'), t('Sumber Modul'), t('Keterangan'), t('Kategori'), t('Metode'), t('Uang Masuk'), t('Uang Keluar'), t('Saldo Berjalan')],
  ]
  const money = (v: number, color: [number, number, number] | null): CellDef => ({
    content: v === 0 ? '-' : rp(v),
    styles: { halign: 'right', textColor: v === 0 ? [170, 165, 155] : (color ?? INK), fontStyle: v === 0 ? 'normal' : 'bold' },
  })
  const body: RowInput[] = rows.map((r) => [
    formatDate(r.date),
    r.sourceLabel,
    r.description,
    r.category,
    r.method,
    money(r.cashIn, OKC),
    money(r.cashOut, REDC),
    { content: rp(r.balance), styles: { halign: 'right', fontStyle: 'bold', textColor: r.balance < 0 ? REDC : INK } },
  ])
  body.push([
    { content: t('Total'), colSpan: 5, styles: { fontStyle: 'bold', fillColor: GOLDTINT, textColor: INK } },
    { content: rp(totals.cashIn), styles: { halign: 'right', fontStyle: 'bold', fillColor: GOLDTINT, textColor: OKC } },
    { content: rp(totals.cashOut), styles: { halign: 'right', fontStyle: 'bold', fillColor: GOLDTINT, textColor: REDC } },
    { content: rp(totals.net), styles: { halign: 'right', fontStyle: 'bold', fillColor: GOLDTINT, textColor: totals.net < 0 ? REDC : GREEN } },
  ])

  autoTable(doc, {
    startY: 46,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: [230, 224, 213], lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 34 },
      4: { cellWidth: 22 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 28 },
      7: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: M, right: M },
  })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Catering Berkah 1121 · ${t('Arus Kas')}`, M, pageH - 6)
    doc.text(`${t('Hal')} ${i}/${pages}`, pageW - M, pageH - 6, { align: 'right' })
  }

  doc.save(`Arus Kas - Catering Berkah - ${filterLabel}.pdf`)
}
