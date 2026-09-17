// Parse the individual transactions from a BCA account-statement PDF's text.
// BCA prints US-format amounts (18,739,764.28), debits carry a "DB" suffix and
// credits are marked "CR" in the header; each transaction is a multi-line block
// that starts with a "dd/mm" date. Validated against the statement's own summary
// (matches the CR/DB counts and totals exactly).
import type { BankTxn, BcaParseResult } from './parseBca'
import { extractBankSummaryFromText, type BankMonthSummary } from './bankSummary'

const START = /^(\d{1,2})\/(\d{2})\s/
const SKIP = /SALDO AWAL|SALDO AKHIR|MUTASI (CR|DB)|Bersambung|TANGGAL KETERANGAN/

function usAmount(s: string): number | null {
  const m = s.replace(/\s/g, '').match(/\d{1,3}(?:,\d{3})*\.\d{2}/)
  return m ? parseFloat(m[0].replace(/,/g, '')) : null
}

function cleanDescription(block: string[]): string {
  const parts: string[] = []
  block.forEach((line, i) => {
    let s = line.trim()
    if (i === 0) s = s.replace(START, '')
    s = s
      .replace(/TANGGAL\s*:\s*\d{1,2}\/\d{2}/gi, ' ')
      .replace(/[\d,]+\.\d{2}(\s+DB)?/g, ' ') // amounts (+ DB)
      .replace(/\b[A-Z]{2,}\d{6,}\b/g, ' ') // code tokens like TOPUP081284…
      .replace(/\b\d{3,}\/\S+/g, ' ') // 0108/FTSCY/WS95271
      .replace(/\b\d{4,}\b/g, ' ') // long reference numbers
      .replace(/\b(M-?BCA|MyBCA|BIF|IDR)\b/gi, ' ')
      .replace(/SALDO (AWAL|AKHIR)|MUTASI (CR|DB)|[:]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!s || /^(DB|CR)$/i.test(s) || /^-+$/.test(s)) return
    parts.push(s)
  })
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 90) || '(tanpa keterangan)'
}

/** Parse transactions + summary from a BCA statement PDF's extracted text. */
export function parseBcaPdf(text: string, fallbackYear: number): { result: BcaParseResult; summary: BankMonthSummary | null } {
  const summary = extractBankSummaryFromText(text)
  const year = summary?.monthKey ? Number(summary.monthKey.slice(0, 4)) : fallbackYear

  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''))
  const blocks: string[][] = []
  let cur: string[] | null = null
  for (const l of lines) {
    // The summary block (SALDO AWAL: / MUTASI: / SALDO AKHIR:) ends the ledger.
    if (/SALDO (AWAL|AKHIR)\s*:|MUTASI (CR|DB)\s*:/.test(l)) {
      if (cur) blocks.push(cur)
      cur = null
      continue
    }
    if (START.test(l)) {
      if (cur) blocks.push(cur)
      cur = [l]
    } else if (cur) cur.push(l)
  }
  if (cur) blocks.push(cur)

  const txns: BankTxn[] = []
  let n = 0
  for (const b of blocks) {
    const head = b[0]
    if (SKIP.test(head)) continue
    const dm = head.match(START)
    if (!dm) continue
    const date = `${year}-${dm[2]}-${dm[1].padStart(2, '0')}`

    // Mutation = the amount on the closing line (amount [DB] [saldo]); scan up.
    let amount: number | null = null
    let dir: 'in' | 'out' | null = null
    let found = false
    for (let i = b.length - 1; i >= 0; i--) {
      const m = b[i].trim().match(/^([\d,]+\.\d{2})(?:\s+(DB))?(?:\s+[\d,]+\.\d{2})?$/)
      if (m) {
        amount = usAmount(m[1])
        dir = m[2] ? 'out' : null
        found = true
        break
      }
    }
    if (!found) {
      // Single-line transaction (interest, tax, admin): prefer the DB-marked
      // amount, else the first amount (never the trailing saldo).
      const joined = b.join('\n')
      const dbm = joined.match(/([\d,]+\.\d{2})\s+DB\b/)
      if (dbm) {
        amount = usAmount(dbm[1])
        dir = 'out'
      } else {
        const am = joined.match(/[\d,]+\.\d{2}/)
        if (am) amount = usAmount(am[0])
      }
    }
    if (amount == null) continue
    if (dir == null) {
      if (/\bCR\b/.test(head)) dir = 'in'
      else if (/BUNGA/.test(head) && !/PAJAK|KOREKSI/.test(head)) dir = 'in'
      else dir = 'out'
    }

    txns.push({
      id: `bcapdf-${n++}`,
      date,
      rawDate: `${dm[1]}/${dm[2]}`,
      description: cleanDescription(b),
      amount,
      direction: dir,
      balance: null,
    })
  }

  const totalIn = summary?.totalIn ?? txns.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = summary?.totalOut ?? txns.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const result: BcaParseResult = {
    txns,
    openingBalance: summary?.opening ?? null,
    closingBalance: summary?.closing ?? null,
    totalIn,
    totalOut,
    warnings: txns.length === 0 ? ['Tidak ada transaksi yang terbaca. Pastikan file CSV mutasi BCA atau tempel teks mutasi apa adanya.'] : [],
  }
  return { result, summary }
}
