// Tolerant parser for a BCA account statement (mutasi rekening).
//
// BCA's KlikBCA "Download" export is a CSV whose columns are
// Tanggal, Keterangan, Cabang, Mutasi, Saldo, where Mutasi carries a "DB"
// (debit / money out) or "CR" (credit / money in) suffix and every amount is
// in Indonesian format (1.234.567,89). Users may also paste the table as text.
// This parser handles both: it maps columns when a header row is present and
// falls back to a line-by-line scan otherwise.

export interface BankTxn {
  id: string
  date: string // YYYY-MM-DD (year filled from the reconciliation context)
  rawDate: string
  description: string
  amount: number // always positive
  direction: 'in' | 'out' // CR -> in, DB -> out
  balance: number | null
}

export interface BcaParseResult {
  txns: BankTxn[]
  openingBalance: number | null
  closingBalance: number | null
  totalIn: number
  totalOut: number
  warnings: string[]
}

// Parse an Indonesian-formatted number ("1.234.567,89" -> 1234567.89).
export function parseIdAmount(raw: string): number | null {
  const m = raw.replace(/\s+/g, '').match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Split a CSV line, honouring quoted fields (BCA wraps some in single quotes).
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q: '"' | "'" | null = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === q) {
        if (line[i + 1] === q) {
          cur += c
          i++
        } else q = null
      } else cur += c
    } else if (c === '"' || c === "'") q = c
    else if (c === ',' || c === ';' || c === '\t') out.push(cur), (cur = '')
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^'+|'+$/g, ''))
}

function normDate(raw: string, year: number): { iso: string; raw: string } | null {
  const m = raw.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
  if (!m) return null
  const dd = m[1].padStart(2, '0')
  const mm = m[2].padStart(2, '0')
  let yyyy = m[3] ? m[3] : String(year)
  if (yyyy.length === 2) yyyy = `20${yyyy}`
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null
  return { iso: `${yyyy}-${mm}-${dd}`, raw }
}

const AMOUNT = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{2}/g

// Pull the mutation amount + direction and the running balance from a raw row.
// The mutation is the amount immediately followed by a DB/CR marker; the
// balance is the last remaining amount (the Saldo column). Working on the raw
// line makes this robust to CSV, tab, or space separated pastes alike.
function extractAmounts(line: string): {
  amount: number | null
  direction: 'in' | 'out' | null
  balance: number | null
} {
  const mut = line.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(DB|DR|CR|CK)\b/i)
  let amount: number | null = null
  let direction: 'in' | 'out' | null = null
  let rest = line
  if (mut) {
    amount = parseIdAmount(mut[1])
    direction = /^(DB|DR)$/i.test(mut[2]) ? 'out' : 'in'
    rest = line.replace(mut[0], '  ')
  }
  const amts = rest.match(AMOUNT)
  const balance = amts && amts.length ? parseIdAmount(amts[amts.length - 1]) : null
  return { amount, direction, balance }
}

// Best-effort description when the row is not clean CSV: strip the date, the
// amounts, DB/CR markers, and 3-4 digit branch codes from the raw line.
function deriveDescription(line: string, dateCell: string): string {
  const cleaned = line
    .replace(dateCell, ' ')
    .replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(DB|DR|CR|CK)\b/gi, ' ')
    .replace(AMOUNT, ' ')
    .replace(/\b\d{3,4}\b/g, ' ')
    .replace(/[,;\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || '(tanpa keterangan)'
}

export function parseBcaStatement(text: string, year: number): BcaParseResult {
  const warnings: string[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const txns: BankTxn[] = []
  let openingBalance: number | null = null
  let closingBalance: number | null = null
  let n = 0

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Explicit opening / closing balance rows.
    if (lower.includes('saldo awal')) {
      openingBalance = parseIdAmount(line)
      continue
    }
    if (lower.includes('saldo akhir')) {
      closingBalance = parseIdAmount(line)
      continue
    }
    // Header / metadata rows (no transaction).
    if (/tanggal/.test(lower) && /(mutasi|keterangan|saldo)/.test(lower)) continue
    if (/^(rekening|nama|periode|mata uang|no\.? rekening|bca|halaman)/i.test(line)) continue

    const dateToken = line.match(/\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?/)?.[0]
    if (!dateToken) continue
    const d = normDate(dateToken, year)
    if (!d) continue

    const { amount, direction, balance } = extractAmounts(line)
    if (amount == null || direction == null) continue

    // Description: prefer the Keterangan cell in a clean CSV row, otherwise
    // derive it from the raw line.
    const cells = splitCsvLine(line)
    const cellDesc = cells
      .filter(
        (c) =>
          !/^\d{1,2}[/-]\d{1,2}/.test(c) &&
          parseIdAmount(c) == null &&
          !/^\d{3,4}$/.test(c) &&
          !/^(DB|DR|CR|CK)$/i.test(c),
      )
      .sort((a, b) => b.length - a.length)[0]
    const desc = cellDesc && cellDesc.length >= 3 ? cellDesc : deriveDescription(line, dateToken)

    txns.push({
      id: `bca-${n++}`,
      date: d.iso,
      rawDate: d.raw,
      description: desc.replace(/\s+/g, ' ').trim(),
      amount,
      direction,
      balance,
    })
  }

  // Derive opening / closing from the running balance column when not explicit.
  if (txns.length > 0) {
    const first = txns[0]
    const last = txns[txns.length - 1]
    if (closingBalance == null && last.balance != null) closingBalance = last.balance
    if (openingBalance == null && first.balance != null) {
      const signed = first.direction === 'in' ? first.amount : -first.amount
      openingBalance = first.balance - signed
    }
  }

  const totalIn = txns.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = txns.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)

  if (txns.length === 0)
    warnings.push('Tidak ada transaksi yang terbaca. Pastikan file CSV mutasi BCA atau tempel teks mutasi apa adanya.')

  return { txns, openingBalance, closingBalance, totalIn, totalOut, warnings }
}
