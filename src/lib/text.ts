// Small Indonesian connector words that stay lowercase in a title (unless they
// are the first word).
const SMALL_WORDS = new Set([
  'dan', 'atau', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'pada', 'per',
  'the', 'of', 'in', 'on', 'a', 'an',
])

/**
 * Title-case a free-text name for display (menu, bahan, customer, keterangan …).
 * - Capitalizes the first letter of each word.
 * - Keeps small connector words (dan, atau, di, per, …) lowercase, except when
 *   they are the first word.
 * - Preserves ALL-CAPS acronyms/units (BCA, QRIS, DP, KUR) and words with digits.
 */
export function titleCase(input: string | null | undefined): string {
  if (!input) return ''
  const tokens = input.split(/(\s+)/) // keep the whitespace separators
  let firstWordSeen = false
  return tokens
    .map((token) => {
      if (/^\s*$/.test(token)) return token
      const letters = token.replace(/[^A-Za-z]/g, '')
      const isFirst = !firstWordSeen
      firstWordSeen = true
      // Keep acronyms / units already uppercase (BCA, QRIS, DP, 15, 20×20).
      if (letters.length > 1 && letters === letters.toUpperCase()) return token
      const lower = token.toLowerCase()
      if (!isFirst && SMALL_WORDS.has(lower)) return lower
      // Capitalize the first alphabetic character (handles "(nasi" → "(Nasi").
      return lower.replace(/[a-z]/, (c) => c.toUpperCase())
    })
    .join('')
}
