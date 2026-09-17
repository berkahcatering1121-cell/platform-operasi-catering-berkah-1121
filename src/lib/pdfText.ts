// Extract plain text from a PDF in the browser using pdf.js. Loaded lazily
// (dynamic import) so the ~1MB library is only fetched when a user actually
// uploads a PDF, and never bloats the initial app load.
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Bundle the worker via Vite's ?url so it loads from our own origin (CSP-safe).
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data }).promise
  let out = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
      out += item.str ?? ''
      out += item.hasEOL ? '\n' : ' '
    }
    out += '\n'
  }
  try {
    doc.destroy()
  } catch {
    /* ignore */
  }
  return out
}
