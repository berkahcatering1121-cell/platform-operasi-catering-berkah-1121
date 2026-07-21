// Rupiah + locale formatting. Indonesian by default; the LanguageProvider calls
// `setFormatLang('en')` to switch month names and KPI short-forms to English.

let LANG: 'id' | 'en' = 'id'
export function setFormatLang(l: 'id' | 'en') {
  LANG = l
}

/** "Rp 1.520.000" — full thousands-separated Rupiah. */
export function formatRupiah(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString(LANG === 'en' ? 'en-US' : 'id-ID')
}

/** Short form for KPI tiles: "Rp 1,5 jt" (ID) / "Rp 1.5M" (EN). */
export function formatRupiahShort(n: number): string {
  const v = n || 0
  if (LANG === 'en') {
    if (Math.abs(v) >= 1e9) return 'Rp ' + (v / 1e9).toFixed(2) + 'B'
    return 'Rp ' + (v / 1e6).toFixed(1) + 'M'
  }
  if (Math.abs(v) >= 1e9) return 'Rp ' + (v / 1e9).toFixed(2).replace('.', ',') + ' M'
  return 'Rp ' + (v / 1e6).toFixed(1).replace('.', ',') + ' jt'
}

/** "45,2%" — a ratio (0..1) as an id-ID percentage. */
export function formatPercent(ratio: number, digits = 1): string {
  return (ratio * 100).toFixed(digits).replace('.', ',') + '%'
}

/** "45%" — integer percentage from a ratio. */
export function formatPercentInt(ratio: number): string {
  return Math.round(ratio * 100) + '%'
}

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Long month names for the active language (used by pickers). */
export function months(): string[] {
  return LANG === 'en' ? EN_MONTHS : ID_MONTHS
}

/** Short month names for the active language (used by charts). */
export function monthsShort(): string[] {
  return LANG === 'en' ? EN_MONTHS_SHORT : ID_MONTHS_SHORT
}

const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Day names (Sunday-indexed) for the active language. */
export function days(): string[] {
  return LANG === 'en' ? EN_DAYS : ID_DAYS
}

/** "Juni 2026" / "June 2026" from an ISO date or "YYYY-MM" key. */
export function formatMonthLabel(iso: string): string {
  const [y, m] = iso.split('-')
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1))
  return `${months()[idx]} ${y}`
}

/** "02 Jun 2026" from an ISO date string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return '—'
  const short = LANG === 'en' ? EN_MONTHS_SHORT : ID_MONTHS_SHORT
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd} ${short[d.getMonth()]} ${d.getFullYear()}`
}

export { ID_MONTHS, ID_MONTHS_SHORT }
