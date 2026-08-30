// Dependency-free reader for real .xlsx files. Excel stores each part with
// DEFLATE compression inside a ZIP; we unzip using the browser's built-in
// DecompressionStream (no library) and parse the first worksheet + shared
// strings into a plain string[][] grid.

const U32 = (dv: DataView, o: number) => dv.getUint32(o, true)
const U16 = (dv: DataView, o: number) => dv.getUint16(o, true)

async function inflate(data: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return data // stored
  if (method !== 8) throw new Error(`Metode kompresi ZIP tidak didukung (${method}).`)
  if (typeof DecompressionStream === 'undefined')
    throw new Error('Browser ini tidak mendukung pembacaan .xlsx. Simpan sebagai CSV atau tempel teksnya.')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Extract the named entries from a ZIP archive (decompressed).
async function unzip(buf: ArrayBuffer, want: (name: string) => boolean): Promise<Record<string, string>> {
  const dv = new DataView(buf)
  const bytes = new Uint8Array(buf)
  // Locate the End Of Central Directory record (scan back from the end).
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (U32(dv, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('File bukan .xlsx yang valid (ZIP tidak terbaca).')
  const count = U16(dv, eocd + 10)
  let p = U32(dv, eocd + 16)
  const out: Record<string, string> = {}
  const td = new TextDecoder()
  for (let i = 0; i < count; i++) {
    if (U32(dv, p) !== 0x02014b50) break
    const method = U16(dv, p + 10)
    const compSize = U32(dv, p + 20)
    const nameLen = U16(dv, p + 28)
    const extraLen = U16(dv, p + 30)
    const commentLen = U16(dv, p + 32)
    const localOff = U32(dv, p + 42)
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    if (want(name)) {
      const lNameLen = U16(dv, localOff + 26)
      const lExtraLen = U16(dv, localOff + 28)
      const start = localOff + 30 + lNameLen + lExtraLen
      out[name] = td.decode(await inflate(bytes.subarray(start, start + compSize), method))
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

// Concatenate every <t> run inside one shared-string <si> element.
function textOf(xml: string): string {
  const parts = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g)
  if (!parts) return ''
  return parts.map((p) => decodeEntities(p.replace(/<t[^>]*>/, '').replace(/<\/t>/, ''))).join('')
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const items = xml.match(/<si>[\s\S]*?<\/si>/g)
  if (items) for (const si of items) out.push(textOf(si))
  return out
}

// "C" -> 2 (0-based column index).
function colIndex(ref: string): number {
  const m = ref.match(/^([A-Z]+)/)
  if (!m) return 0
  let n = 0
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  const rowXmls = xml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []
  for (const rowXml of rowXmls) {
    const cells: string[] = []
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    let m: RegExpExecArray | null
    while ((m = cellRe.exec(rowXml))) {
      const attrs = m[1]
      const inner = m[2] ?? ''
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1]
      const type = attrs.match(/t="([^"]+)"/)?.[1]
      let value = ''
      if (type === 's') {
        const idx = Number(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '-1')
        value = shared[idx] ?? ''
      } else if (type === 'inlineStr') {
        value = textOf(inner)
      } else {
        value = decodeEntities(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '')
      }
      const ci = ref ? colIndex(ref) : cells.length
      while (cells.length < ci) cells.push('')
      cells[ci] = value.trim()
    }
    rows.push(cells)
  }
  return rows
}

/** Read the first worksheet of an .xlsx file into a grid of trimmed strings. */
export async function readXlsxFirstSheet(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet1\.xml$/.test(n))
  const sheetXml = files['xl/worksheets/sheet1.xml']
  if (!sheetXml) throw new Error('Lembar kerja pertama tidak ditemukan di file .xlsx.')
  const shared = files['xl/sharedStrings.xml'] ? parseSharedStrings(files['xl/sharedStrings.xml']) : []
  return parseSheet(sheetXml, shared)
}
