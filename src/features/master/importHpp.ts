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
  valid: boolean
  issues: string[]
}

const up = (s: string | undefined) => (s ?? '').trim().toUpperCase()

function num(s: string | undefined): number {
  if (s == null) return 0
  const v = parseFloat(String(s).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(v) ? v : 0
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

  // Recipe reproduces HPP/porsi exactly: bahan + (sisa sebagai biaya tambahan).
  const matR = Math.round(materialHpp)
  const totR = Math.round(totalHpp)
  const biayaR = Math.max(0, totR - matR)
  const recipe: IngredientDraft[] = [
    { name: 'Bahan baku / porsi', qty: '1', unit: 'porsi', price: String(matR) },
  ]
  if (biayaR > 0) {
    recipe.push({
      name: 'Biaya tambahan / porsi (tenaga kerja, sewa alat, listrik, gas, transportasi, dll.)',
      qty: '1',
      unit: 'porsi',
      price: String(biayaR),
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
