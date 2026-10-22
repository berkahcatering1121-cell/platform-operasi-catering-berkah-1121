// Auto-generated sales invoice (PDF). Built from a single sale: the line total
// is always portions x price/porsi, matching the quantity sold. Styling mirrors
// the P&L / Cash-Flow exports (green header band, brand logo, Rupiah figures).

import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'

const GREEN: [number, number, number] = [16, 96, 63]
const GOLD: [number, number, number] = [226, 199, 126]
const INK: [number, number, number] = [40, 28, 21]
const MUTED: [number, number, number] = [120, 110, 90]
const REDC: [number, number, number] = [179, 38, 30]
const GOLDTINT: [number, number, number] = [250, 244, 222]

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const rp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// ISO (YYYY-MM-DD) -> "22 Oktober 2026"; invoices stay Indonesian regardless of UI language.
function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  if (!m) return iso || '-'
  return `${Number(m[3])} ${ID_MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`
}

export interface InvoiceData {
  invoiceNo?: string
  sale_date: string
  customer: string
  menu_name: string | null
  menu_category: string | null
  portions: number
  price_per_portion: number
  total: number
  paid_amount: number
  sisa: number
  status: string
  method: string | null
  pic_name?: string | null
  notes: string | null
}

// Downscale the brand logo to a small JPEG tile (transparent corners -> band green).
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

// Stable-ish invoice number from the sale date + customer when none is supplied.
export function invoiceNumberFor(sale_date: string, customer: string, id?: string): string {
  const d = (sale_date || '').replace(/-/g, '')
  if (id) return `INV-${d}-${id.slice(0, 6).toUpperCase()}`
  let h = 0
  for (const ch of customer || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const stamp = String(h % 10000).padStart(4, '0')
  return `INV-${d}-${stamp}`
}

export async function generateInvoicePdf(d: InvoiceData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 14
  const invNo = d.invoiceNo ?? invoiceNumberFor(d.sale_date, d.customer)
  const lunas = d.status === 'Lunas' || d.sisa <= 0

  // Normalize figures so the document is internally consistent.
  const total = d.total || (d.portions || 0) * (d.price_per_portion || 0)
  const paid = lunas ? total : Math.min(d.paid_amount || 0, total)
  const sisa = lunas ? 0 : Math.max(0, total - paid)

  // ── Header band ──
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 26, 'F')
  try {
    doc.addImage(await loadLogo('/assets/app-icon.png'), 'JPEG', M, 5, 16, 16)
  } catch {
    /* logo optional */
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Catering Berkah 1121', M + 20, 12)
  doc.setTextColor(...GOLD)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Invoice Penjualan', M + 20, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('INVOICE', pageW - M, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 216, 207)
  doc.text(invNo, pageW - M, 18, { align: 'right' })

  // ── Meta: billed-to (left) + date/status (right) ──
  let y = 38
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('DITAGIHKAN KEPADA', M, y)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(d.customer || '-', M, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  doc.text(`Tanggal: ${longDate(d.sale_date)}`, pageW - M, y, { align: 'right' })
  doc.text(`Status: ${d.status}`, pageW - M, y + 5.5, { align: 'right' })
  if (d.method) doc.text(`Metode: ${d.method}`, pageW - M, y + 11, { align: 'right' })

  // ── Line-item table ──
  const deskripsi = [d.menu_name || 'Menu', d.menu_category ? `(${d.menu_category})` : '']
    .filter(Boolean)
    .join(' ')
  const body: RowInput[] = [[
    '1',
    deskripsi,
    { content: String(d.portions ?? 0), styles: { halign: 'right' } },
    { content: rp(d.price_per_portion), styles: { halign: 'right' } },
    { content: rp(total), styles: { halign: 'right', fontStyle: 'bold' } },
  ]]

  autoTable(doc, {
    startY: y + 14,
    head: [['No', 'Deskripsi', 'Porsi', 'Harga / Porsi', 'Jumlah']],
    body,
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 2.4, lineColor: [230, 224, 213], lineWidth: 0.1, textColor: INK, overflow: 'linebreak' },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: M, right: M },
  })

  // ── Totals block (right aligned) ──
  let ty = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  const labelX = pageW - M - 44
  const valX = pageW - M
  const line = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number]; band?: boolean }) => {
    if (opts?.band) {
      doc.setFillColor(...GOLDTINT)
      doc.rect(labelX - 4, ty - 4.6, valX - labelX + 8, 8, 'F')
    }
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(opts?.bold ? 11 : 9.5)
    doc.setTextColor(...(opts?.color ?? INK))
    doc.text(label, labelX, ty)
    doc.text(value, valX, ty, { align: 'right' })
    ty += opts?.bold ? 8 : 6
  }
  line('Total', rp(total), { bold: true, color: GREEN, band: true })
  if (!lunas) {
    line('Dibayar (DP)', rp(paid))
    line('Sisa', rp(sisa), { bold: true, color: REDC })
  } else {
    line('Dibayar', rp(total), { color: [31, 122, 77] })
  }

  // ── Notes + footer ──
  if (d.notes) {
    const ny = ty + 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('CATATAN', M, ny)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(doc.splitTextToSize(d.notes, pageW - 2 * M), M, ny + 5)
  }

  if (d.pic_name) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(`Dilayani oleh: ${d.pic_name}`, M, pageH - 24)
  }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...GREEN)
  doc.text('Terima kasih atas kepercayaan Anda.', M, pageH - 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Catering Berkah 1121 - ${invNo}`, M, pageH - 8)
  doc.text(longDate(d.sale_date), pageW - M, pageH - 8, { align: 'right' })

  const safeCustomer = (d.customer || 'Customer').replace(/[^\w\s-]/g, '').trim().slice(0, 40)
  doc.save(`Invoice - ${safeCustomer} - ${d.sale_date}.pdf`)
}
