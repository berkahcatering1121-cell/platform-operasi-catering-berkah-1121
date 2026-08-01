// Dependency-free spreadsheet exporters (CSV + real .xlsx).
//
// The .xlsx writer builds a genuine Office Open XML workbook using a stored
// (uncompressed) ZIP container, so it opens cleanly in Excel, Google Sheets,
// and LibreOffice without any third-party library.

// ── Download helpers ──
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── CSV ──
export type CsvCell = string | number
export function toCsv(rows: CsvCell[][]): string {
  const esc = (c: CsvCell) => {
    const s = typeof c === 'number' ? String(c) : c
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n')
}
export function downloadCsv(rows: CsvCell[][], filename: string) {
  // Prepend a UTF-8 BOM so Excel reads accents/Rupiah correctly.
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

// ── XLSX ──
// Cell style ids map to the fixed style table written in styles.xml below:
//   0 default · 1 bold · 2 number (#,##0) · 3 bold number
export type XStyle = 0 | 1 | 2 | 3
export type XCell = string | number | { v: string | number; s?: XStyle }
export interface XSheet {
  name: string
  rows: XCell[][]
  cols?: number[] // optional column widths in characters
}

function xmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function colName(i: number): string {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function cellXml(ref: string, cell: XCell): string {
  let v: string | number
  let s: XStyle
  if (typeof cell === 'object') {
    v = cell.v
    s = cell.s ?? (typeof cell.v === 'number' ? 2 : 0)
  } else {
    v = cell
    s = typeof cell === 'number' ? 2 : 0
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<c r="${ref}" s="${s}"><v>${v}</v></c>`
  }
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`
}

function sheetXml(sheet: XSheet): string {
  const colsXml = sheet.cols
    ? `<cols>${sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const rowsXml = sheet.rows
    .map((row, ri) => {
      const cells = row.map((cell, ci) => cellXml(`${colName(ci)}${ri + 1}`, cell)).join('')
      return `<row r="${ri + 1}">${cells}</row>`
    })
    .join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    colsXml +
    `<sheetData>${rowsXml}</sheetData></worksheet>`
  )
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border/></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`

// Encode a string to UTF-8 bytes backed by a plain ArrayBuffer (so the result
// is a valid BlobPart under the strict typed-array lib types).
function utf8(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(s))
}

// CRC-32 (IEEE) for the ZIP entries.
function crc32(buf: Uint8Array): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

interface ZFile {
  name: string
  data: Uint8Array<ArrayBuffer>
}

// Minimal stored (uncompressed) ZIP archive.
function zip(files: ZFile[]): Blob {
  const parts: Uint8Array<ArrayBuffer>[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const f of files) {
    const nameBytes = utf8(f.name)
    const crc = crc32(f.data)
    const size = f.data.length

    const lh = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(lh.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 0, true) // stored
    lv.setUint16(12, 0x21, true) // DOS date 1980-01-01
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lh.set(nameBytes, 30)
    parts.push(lh, f.data)

    const cd = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(14, 0x21, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    central.push(cd)

    offset += lh.length + size
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  return new Blob([...parts, ...central, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function buildXlsx(sheets: XSheet[]): Blob {
  const enc = utf8
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    `</Types>`

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    sheets.map((s, i) => `<sheet name="${xmlEsc(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    `</sheets></workbook>`

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`

  const files: ZFile[] = [
    { name: '[Content_Types].xml', data: enc(contentTypes) },
    { name: '_rels/.rels', data: enc(rootRels) },
    { name: 'xl/workbook.xml', data: enc(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc(workbookRels) },
    { name: 'xl/styles.xml', data: enc(STYLES_XML) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(sheetXml(s)) })),
  ]
  return zip(files)
}

export function downloadXlsx(sheets: XSheet[], filename: string) {
  downloadBlob(buildXlsx(sheets), filename)
}
