// Per-month bank-statement summary (opening / closing / totals), kept ONLY in
// the viewer's browser localStorage. Bank figures must never be hard-coded into
// the app: the JS bundle is served publicly (before login), so anything baked in
// would leak. Storing per-browser keeps the data private to the owner's device
// while still letting the Dashboard show the real bank balance growth.

export interface BankMonthSummary {
  monthKey: string // "YYYY-MM"
  opening: number
  closing: number
  totalIn: number
  totalOut: number
  inCount?: number
  outCount?: number
  accountLast4?: string // last 4 digits of the account, for display only
  savedAt: string // ISO timestamp
}

const KEY = 'cb-bank-summary'

type Store = Record<string, BankMonthSummary>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

export function getBankSummary(monthKey: string): BankMonthSummary | null {
  return readStore()[monthKey] ?? null
}

export function getAllBankSummaries(): BankMonthSummary[] {
  return Object.values(readStore()).sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
}

export function saveBankSummary(s: BankMonthSummary): void {
  try {
    const store = readStore()
    store[s.monthKey] = s
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* storage unavailable (e.g. private mode) - ignore */
  }
}

export function deleteBankSummary(monthKey: string): void {
  try {
    const store = readStore()
    delete store[monthKey]
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

// ── BCA statement summary extraction (works on the PDF's extracted text) ──

const ID_MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

// BCA prints amounts US-style: "18,739,764.28" (comma thousands, dot decimal).
function usAmount(raw: string): number | null {
  const m = raw.replace(/\s/g, '').match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Pull the authoritative summary block from a BCA statement's text:
 *   PERIODE : AGUSTUS 2026
 *   SALDO AWAL  : 18,739,764.28
 *   MUTASI CR   : 143,660,278.66  132
 *   MUTASI DB   : 101,883,088.76  434
 *   SALDO AKHIR : 60,516,954.18
 * The ": " (colon) distinguishes the summary from the "SALDO AWAL" ledger row.
 */
export function extractBankSummaryFromText(text: string): BankMonthSummary | null {
  const opening = matchAmount(text, /SALDO AWAL\s*:\s*([\d.,]+)/)
  const closing = matchAmount(text, /SALDO AKHIR\s*:\s*([\d.,]+)/)
  if (opening == null || closing == null) return null

  const cr = text.match(/MUTASI CR\s*:\s*([\d.,]+)\s+(\d+)/)
  const db = text.match(/MUTASI DB\s*:\s*([\d.,]+)\s+(\d+)/)
  const totalIn = cr ? usAmount(cr[1]) ?? 0 : Math.max(0, closing - opening)
  const totalOut = db ? usAmount(db[1]) ?? 0 : Math.max(0, opening - closing)

  const per = text.match(/PERIODE\s*:\s*([A-Z]+)\s+(\d{4})/i)
  let monthKey = ''
  if (per) {
    const idx = ID_MONTHS.indexOf(per[1].toUpperCase())
    if (idx >= 0) monthKey = `${per[2]}-${String(idx + 1).padStart(2, '0')}`
  }
  const acct = text.match(/NO\.?\s*REKENING\s*:\s*(\d+)/i)

  return {
    monthKey,
    opening,
    closing,
    totalIn,
    totalOut,
    inCount: cr ? Number(cr[2]) : undefined,
    outCount: db ? Number(db[2]) : undefined,
    accountLast4: acct ? acct[1].slice(-4) : undefined,
    savedAt: new Date().toISOString(),
  }
}

function matchAmount(text: string, re: RegExp): number | null {
  const m = text.match(re)
  return m ? usAmount(m[1]) : null
}
