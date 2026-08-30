// Maps a spreadsheet grid (from .xlsx, .csv, or pasted text) into debt rows,
// with per-row validation so the user can review before importing.
import type { DebtInput } from './api'

export interface ParsedDebtRow {
  input: DebtInput | null
  raw: string[]
  errors: string[]
  rowNo: number
}

export interface DebtImportResult {
  rows: ParsedDebtRow[]
  valid: number
  invalid: number
}

// Column aliases (lower-cased, trimmed). Indonesian + a few English fallbacks.
const FIELD_ALIASES: Record<string, string[]> = {
  debt_date: ['tanggal', 'tgl', 'tgl hutang', 'tanggal hutang', 'date'],
  creditor: ['kreditur', 'kreditor', 'pemberi pinjaman', 'nama', 'creditor', 'vendor', 'supplier'],
  debt_type: ['jenis', 'jenis hutang', 'tipe', 'kategori', 'type'],
  description: ['keterangan', 'deskripsi', 'catatan', 'description', 'notes', 'ket'],
  amount: ['jumlah', 'nominal', 'total', 'jumlah hutang', 'amount'],
  due_date: ['jatuh tempo', 'tempo', 'jatuh_tempo', 'due', 'due date'],
  paid_amount: ['sudah dibayar', 'dibayar', 'terbayar', 'bayar', 'paid', 'paid amount'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Parse CSV / TSV / pasted-from-Excel text into a grid. The delimiter is
// auto-detected (tab, then semicolon, then comma) and quoted fields are honored.
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === delim) {
      row.push(cur)
      cur = ''
    } else if (c === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (c !== '\r') cur += c
  }
  row.push(cur)
  rows.push(row)
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x))
}

// Indonesian or plain number: "1.500.000,50", "12.500.000", "1500000.5",
// "1,500,000" all parse correctly.
function parseAmount(raw: string): number | null {
  const s = raw.trim()
  if (!s) return 0
  let t = s.replace(/[^\d.,-]/g, '')
  if (t === '' || t === '-') return null
  const neg = t.startsWith('-')
  t = t.replace(/-/g, '')
  const lastComma = t.lastIndexOf(',')
  const lastDot = t.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // Both present: the right-most separator is the decimal point.
    if (lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.')
    else t = t.replace(/,/g, '')
  } else if (lastComma > -1) {
    // Comma only: decimal when it trails 1-2 digits, else a thousands grouping.
    t = /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '')
  } else if (lastDot > -1) {
    // Dot only: multiple dots, or a single dot before exactly 3 digits, is a
    // thousands grouping (Indonesian). Otherwise it is a decimal point.
    const dots = (t.match(/\./g) ?? []).length
    if (dots > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '')
  }
  const n = Number(t) * (neg ? -1 : 1)
  return Number.isFinite(n) ? n : null
}

// Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD/MM (year from context).
function parseDate(raw: string, fallbackYear: number): string | null {
  const s = raw.trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let yyyy = m[3] ?? String(fallbackYear)
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

// Detect the header row and map each field to a column index.
function detectColumns(header: string[]): Partial<Record<keyof typeof FIELD_ALIASES, number>> {
  const map: Partial<Record<string, number>> = {}
  header.forEach((cell, i) => {
    const c = norm(cell)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field] == null && aliases.includes(c)) map[field] = i
    }
  })
  return map
}

function looksLikeHeader(row: string[]): boolean {
  const cells = row.map(norm)
  const all = Object.values(FIELD_ALIASES).flat()
  return cells.filter((c) => all.includes(c)).length >= 2
}

export function mapDebtsGrid(grid: string[][], fallbackYear: number): DebtImportResult {
  const nonEmpty = grid.filter((r) => r.some((c) => c && c.trim()))
  if (nonEmpty.length === 0) return { rows: [], valid: 0, invalid: 0 }

  const hasHeader = looksLikeHeader(nonEmpty[0])
  // Default column order when no header is present: matches the template.
  const cols = hasHeader
    ? detectColumns(nonEmpty[0])
    : { debt_date: 0, creditor: 1, debt_type: 2, description: 3, amount: 4, due_date: 5, paid_amount: 6 }
  const dataRows = hasHeader ? nonEmpty.slice(1) : nonEmpty

  const at = (row: string[], key: string) => {
    const i = (cols as Record<string, number | undefined>)[key]
    return i == null ? '' : (row[i] ?? '').trim()
  }

  const rows: ParsedDebtRow[] = dataRows.map((raw, i) => {
    const errors: string[] = []
    const creditor = at(raw, 'creditor')
    const debtDate = parseDate(at(raw, 'debt_date'), fallbackYear)
    const amount = parseAmount(at(raw, 'amount'))
    const paidRaw = at(raw, 'paid_amount')
    const paid = paidRaw ? parseAmount(paidRaw) : 0
    const due = at(raw, 'due_date') ? parseDate(at(raw, 'due_date'), fallbackYear) : null

    if (!creditor) errors.push('Kreditur kosong')
    if (!debtDate) errors.push('Tanggal tidak valid')
    if (amount == null) errors.push('Jumlah tidak valid')
    else if (amount <= 0) errors.push('Jumlah harus lebih dari 0')
    if (paid == null) errors.push('Sudah Dibayar tidak valid')
    if (at(raw, 'due_date') && !due) errors.push('Jatuh Tempo tidak valid')

    const input: DebtInput | null =
      errors.length === 0 && debtDate && amount != null
        ? {
            debt_date: debtDate,
            creditor,
            debt_type: at(raw, 'debt_type') || null,
            description: at(raw, 'description') || null,
            amount,
            due_date: due,
            paid_amount: Math.min(paid ?? 0, amount),
          }
        : null

    return { input, raw, errors, rowNo: i + 1 }
  })

  return {
    rows,
    valid: rows.filter((r) => r.input).length,
    invalid: rows.filter((r) => !r.input).length,
  }
}

// The header + one example row for the downloadable template.
export const DEBT_TEMPLATE: (string | number)[][] = [
  ['Tanggal', 'Kreditur', 'Jenis', 'Keterangan', 'Jumlah', 'Jatuh Tempo', 'Sudah Dibayar'],
  ['2026-08-05', 'Bank BCA', 'Pinjaman Modal', 'Modal usaha', 50000000, '2026-12-31', 10000000],
  ['2026-08-10', 'CV Sumber Rejeki', 'Supplier', 'Bahan baku Agustus', 12500000, '2026-09-10', 0],
]
