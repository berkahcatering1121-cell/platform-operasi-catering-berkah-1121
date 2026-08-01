import { jsPDF } from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'
import { months as monthNames, monthsShort } from '@/lib/format'
import type { PnlMonth } from './api'
import { ROWS, computeMetrics, scopeRevenue, verdict } from './model'

// jsPDF standard fonts only cover WinAnsi, so avoid ≤ ≥ etc. in output.
const GREEN: [number, number, number] = [16, 96, 63]
const INK: [number, number, number] = [40, 28, 21]
const OKC: [number, number, number] = [31, 122, 77]
const REDC: [number, number, number] = [179, 38, 30]
const GOLDTINT: [number, number, number] = [250, 244, 222]

const rp = (n: number) => (Math.round(n) === 0 ? '-' : Math.round(n).toLocaleString('id-ID'))
const pct = (r: number) => (r * 100).toFixed(1).replace('.', ',') + '%'
const pctInt = (r: number) => Math.round(r * 100) + '%'

// Load the logo and downscale it to a small JPEG so it doesn't bloat the PDF.
// Transparent corners are filled with the header-band green so the tile blends in.
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
  months: PnlMonth[]
  year: number
  scope: number // 0 = whole year, 1-12 = single month
  t: (id: string, en?: string) => string
  generatedAt: Date
}

export async function exportPnlPdf({ months, year, scope, t, generatedAt }: Opts) {
  const isYear = scope === 0
  const doc = new jsPDF({ orientation: isYear ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 12
  const periodLabel = isYear ? `${t('Tahun')} ${year}` : `${monthNames()[scope - 1]} ${year}`

  // ── Header band with logo + brand + period ──
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
  doc.text(t('Laporan Laba Rugi (P&L)'), M + 20, 17)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(periodLabel, pageW - M, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 216, 207)
  doc.text(`${t('Dibuat')}: ${generatedAt.toLocaleDateString('id-ID')}`, pageW - M, 17, { align: 'right' })

  // ── P&L table ──
  const cols = isYear ? months : months.filter((m) => m.month_no === scope)
  const colCount = 1 + cols.length + (isYear ? 1 : 0) // Keterangan + months + Total
  const head: RowInput[] = [[
    t('Keterangan'),
    ...cols.map((m) => monthsShort()[m.month_no - 1]),
    ...(isYear ? [`${t('Total')} ${year}`] : []),
  ]]

  const moneyCell = (v: number, strong: boolean, green: boolean, total = false): CellDef => ({
    content: rp(v),
    styles: {
      halign: 'right',
      fontStyle: strong || total ? 'bold' : 'normal',
      textColor: v < 0 ? REDC : green ? OKC : total ? GREEN : INK,
      ...(total ? { fillColor: GOLDTINT } : {}),
    },
  })
  const pctCell = (r: number | null, total = false): CellDef => ({
    content: r == null ? '-' : pct(r),
    styles: { halign: 'right', textColor: [120, 110, 90], fontStyle: total ? 'bold' : 'normal', ...(total ? { fillColor: GOLDTINT } : {}) },
  })

  const body: RowInput[] = ROWS.map((row) => {
    if (row.kind === 'header') {
      return [{ content: t(row.label), colSpan: colCount, styles: { fillColor: [241, 246, 242], textColor: GREEN, fontStyle: 'bold' } }]
    }
    const strong = row.kind === 'money' && !!row.strong
    const green = row.kind === 'money' && row.accent === 'green'
    const label: CellDef = {
      content: (row.kind === 'money' && row.indent ? '   ' : '') + t(row.label),
      styles: { halign: 'left', fontStyle: strong ? 'bold' : row.kind === 'pct' ? 'italic' : 'normal', textColor: green ? OKC : INK },
    }
    if (row.kind === 'money') {
      const cells = cols.map((m) => moneyCell(row.get(m), strong, green))
      const total = isYear ? [moneyCell(cols.reduce((a, m) => a + row.get(m), 0), strong, green, true)] : []
      return [label, ...cells, ...total]
    }
    const cells = cols.map((m) => { const d = row.den(m); return pctCell(d > 0 ? row.numr(m) / d : null) })
    const total = isYear
      ? [(() => { const nn = cols.reduce((a, m) => a + row.numr(m), 0); const dd = cols.reduce((a, m) => a + row.den(m), 0); return pctCell(dd > 0 ? nn / dd : null, true) })()]
      : []
    return [label, ...cells, ...total]
  })

  autoTable(doc, {
    startY: 30,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: isYear ? 6.6 : 9.5, cellPadding: isYear ? 1 : 1.6, lineColor: [230, 224, 213], lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: isYear ? 6.6 : 8.5 },
    columnStyles: { 0: { halign: 'left', cellWidth: isYear ? 34 : 96 } },
    margin: { left: M, right: M },
  })

  // ── Internal analysis ──
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9
  if (y > pageH - 40) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(t('Catatan Analisis Internal'), M, y)

  if (scopeRevenue(months, scope) <= 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 110, 90)
    doc.setFontSize(9)
    doc.text(t('Belum ada pendapatan pada periode ini, rasio belum dapat dihitung.'), M, y + 8)
  } else {
    const aHead: RowInput[] = [[t('Metrik'), t('Nilai'), t('Target'), t('Status'), t('Catatan')]]
    const aBody: RowInput[] = computeMetrics(months, scope).map((m) => {
      const v = verdict(m)
      const tone = v.tone === 'green' ? OKC : v.tone === 'amber' ? ([154, 107, 0] as [number, number, number]) : REDC
      return [
        { content: t(m.label), styles: { fontStyle: 'bold', textColor: INK } },
        { content: pct(m.value), styles: { halign: 'right', textColor: tone, fontStyle: 'bold' } },
        { content: `${m.kind === 'cost' ? t('maks') : t('min')} ${pctInt(m.target)}`, styles: { halign: 'center', textColor: [110, 100, 84] } },
        { content: t(v.label), styles: { halign: 'center', fontStyle: 'bold', textColor: tone } },
        { content: v.tone !== 'green' ? t(m.note) : '', styles: { textColor: [110, 100, 84] } },
      ]
    })
    autoTable(doc, {
      startY: y + 4,
      head: aHead,
      body: aBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, valign: 'top', lineColor: [230, 224, 213], lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 22 }, 2: { cellWidth: 24 }, 3: { cellWidth: 26 }, 4: { cellWidth: 'auto' } },
      margin: { left: M, right: M },
    })
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Catering Berkah 1121 · P&L ${periodLabel}`, M, pageH - 6)
    doc.text(`${t('Hal')} ${i}/${pages}`, pageW - M, pageH - 6, { align: 'right' })
  }

  doc.save(`Laporan P&L - Catering Berkah - ${periodLabel}.pdf`)
}
