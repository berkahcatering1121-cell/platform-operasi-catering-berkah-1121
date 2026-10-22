// Parser for the "HPP Catering" cost workbook (one menu package per sheet).
//
// Each sheet lays out an ingredient + additional-cost breakdown and ends with a
// summary block that is identical in shape across every sheet:
//
//   TOTAL HPP BAHAN/KOMPONEN   | ... | <biaya> | ... | <HPP bahan / porsi>
//   TOTAL HPP                  | ... | <biaya> | ... | <HPP total / porsi>
//   Target margin              | ... | <margin fraction>
//   Harga jual/porsi           | ... | <harga formula> | <harga dibulatkan>
//
// We read those authoritative figures (columns are stable: F=5, H=7, G=6) and
// turn each sheet into one menu item whose recipe reproduces the HPP/porsi.

import { titleCase } from '@/lib/text'
import type { IngredientDraft } from '@/lib/db'
import type { XlsxSheet } from '@/lib/xlsxRead'

export interface HppMenu {
  sheet: string
  name: string
  porsiLabel: string
  porsiTotal: number
  materialHpp: number // per porsi
  totalHpp: number // per porsi
  margin: number // fraction, e.g. 0.3
  computedPrice: number // harga jual dari formula
  sellPrice: number // harga jual dibulatkan (yang dipakai)
  recipe: IngredientDraft[]
  ingredientCount: number // jumlah baris bahan (tanpa baris biaya tambahan)
  valid: boolean
  issues: string[]
}

const up = (s: string | undefined) => (s ?? '').trim().toUpperCase()

function num(s: string | undefined): number {
  if (s == null) return 0
  const v = parseFloat(String(s).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(v) ? v : 0
}

// Round to at most 2 decimals so summed per-porsi costs stay (near) exact.
const r2 = (n: number) => Math.round(n * 100) / 100

// Indonesian number for the per-porsi amount shown in the ingredient name.
function fmtQty(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 4 })
}

// "Osek - Daging (0,05 kg/porsi)" - component gives context + disambiguates
// repeated spice rows; the parenthetical keeps the real measure visible.
function ingredientName(component: string, bahan: string, perPorsiQty: number, unit: string): string {
  const base = component && up(component) !== up(bahan) ? `${component} - ${bahan}` : bahan
  if (perPorsiQty > 0) return `${base} (${fmtQty(perPorsiQty)}${unit ? ' ' + unit : ''}/porsi)`
  return base
}

function rowStarting(grid: string[][], prefix: string): string[] | undefined {
  return grid.find((r) => up(r[0]).startsWith(prefix))
}

/** Parse one worksheet; returns null when it is not an HPP menu sheet. */
export function parseHppSheet(sheet: XlsxSheet): HppMenu | null {
  const { name: sheetName, grid } = sheet
  const titleRow = grid.find((r) => up(r[0]).includes('HPP CATERING'))
  if (!titleRow) return null

  const title = (titleRow[0] ?? '').trim()
  // Menu part sits after " - "; the "(...)" holds the porsi basis.
  const afterDash = title.includes(' - ') ? title.slice(title.indexOf(' - ') + 3).trim() : title
  const porsiLabel = afterDash.match(/\(([^)]*)\)/)?.[1]?.trim() ?? ''
  const porsiTotal = (porsiLabel.match(/\d+/g) ?? []).reduce((a, n) => a + parseInt(n, 10), 0)

  let menuName = afterDash.replace(/\([^)]*\)/, '').trim()
  // A few "Prasmanan" sheets drop the word from the title; add it back so the
  // two "Nasi Rames" packages (prasmanan vs bulk) do not collide by name.
  if (up(sheetName).includes('PRASMANAN') && !up(menuName).includes('PRASMANAN')) {
    menuName = `Prasmanan ${menuName}`
  }
  menuName = titleCase(menuName.toLowerCase())

  const materialHpp = num(rowStarting(grid, 'TOTAL HPP BAHAN')?.[7])
  const totalRow = grid.find((r) => up(r[0]) === 'TOTAL HPP')
  const totalHpp = num(totalRow?.[7])

  let margin = num(rowStarting(grid, 'TARGET MARGIN')?.[5])
  if (margin <= 0 || margin >= 1) margin = 0.3

  const priceRow = rowStarting(grid, 'HARGA JUAL/PORSI')
  const computedPrice = num(priceRow?.[5])
  // Column G holds the business-rounded price; fall back to the formula value
  // rounded up to the nearest Rp500 when the sheet omits it (e.g. Nasi Bungkus).
  let sellPrice = num(priceRow?.[6])
  if (!sellPrice) sellPrice = Math.ceil(computedPrice / 500) * 500

  // ── Detailed recipe: one line per ingredient (bahan) row ──
  // Each line is expressed per porsi (qty 1 x 'porsi' x biaya-per-porsi) so the
  // summed HPP matches the sheet, while the real amount + unit live in the name.
  const itemized: IngredientDraft[] = []
  const headerIdx = grid.findIndex((r) => up(r[0]) === 'KOMPONEN')
  let component = ''
  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i]
      if (up(row[0]).startsWith('TOTAL HPP')) break
      const c0 = (row[0] ?? '').trim()
      const bahan = (row[1] ?? '').trim()
      const perPorsi = num(row[7])
      const porsiRow = num(row[6]) || porsiTotal
      const perPorsiQty = porsiRow > 0 ? num(row[2]) / porsiRow : 0
      const unit = (row[3] ?? '').trim()
      if (bahan) {
        // Komponen label (col0) introduces the group for this and later rows.
        if (c0) component = c0
        if (perPorsi > 0)
          itemized.push({ name: ingredientName(component, bahan, perPorsiQty, unit), qty: '1', unit: 'porsi', price: String(r2(perPorsi)) })
      } else if (c0) {
        if (perPorsi > 0) {
          // Standalone line named in col0 (e.g. packaging: Thinwall, Sendok).
          itemized.push({ name: ingredientName('', c0, perPorsiQty, unit), qty: '1', unit: 'porsi', price: String(r2(perPorsi)) })
        } else {
          component = c0 // group header without its own cost
        }
      }
    }
  }

  // Keep the itemized recipe only when its bahan total reconciles with the
  // sheet's "TOTAL HPP BAHAN" (guards against multi-section sheets like Nasi
  // Bungkus whose per-row figures use different porsi bases). Otherwise fall
  // back to a clean summary so HPP/porsi stays exactly right.
  const itemizedSum = itemized.reduce((s, r) => s + Number(r.price), 0)
  const reconciled = materialHpp > 0 && Math.abs(itemizedSum - materialHpp) <= materialHpp * 0.02 + 5
  const recipe: IngredientDraft[] = []
  let ingredientCount = 0
  if (itemized.length > 0 && reconciled) {
    recipe.push(...itemized)
    ingredientCount = itemized.length
  } else if (materialHpp > 0) {
    recipe.push({ name: 'Bahan baku / porsi', qty: '1', unit: 'porsi', price: String(Math.round(materialHpp)) })
  }

  // Overhead = total HPP minus what the bahan lines already account for, so the
  // menu's computed HPP lands on the sheet's Total HPP/porsi.
  const bahanSum = recipe.reduce((s, r) => s + Number(r.price), 0)
  const biayaTambahan = Math.round(totalHpp - bahanSum)
  if (biayaTambahan > 0) {
    recipe.push({
      name: 'Biaya tambahan / porsi (tenaga kerja, sewa alat, listrik, gas, transportasi, dll.)',
      qty: '1',
      unit: 'porsi',
      price: String(biayaTambahan),
    })
  }

  const issues: string[] = []
  if (!menuName) issues.push('Nama menu tidak terbaca')
  if (totalHpp <= 0) issues.push('HPP total tidak terbaca')
  if (sellPrice <= 0) issues.push('Harga jual tidak terbaca')

  return {
    sheet: sheetName,
    name: menuName,
    porsiLabel,
    porsiTotal,
    materialHpp,
    totalHpp,
    margin,
    computedPrice,
    sellPrice,
    recipe,
    ingredientCount,
    valid: issues.length === 0,
    issues,
  }
}

/** Parse every HPP menu sheet in a workbook, preserving order. */
export function parseHppWorkbook(sheets: XlsxSheet[]): HppMenu[] {
  const out: HppMenu[] = []
  for (const s of sheets) {
    const menu = parseHppSheet(s)
    if (menu) out.push(menu)
  }
  return out
}

/** Short description stored on the menu item for provenance. */
export function hppDescription(m: HppMenu): string {
  return `Basis HPP: ${m.porsiLabel || `${m.porsiTotal} porsi`} (diimpor dari HPP Catering).`
}
