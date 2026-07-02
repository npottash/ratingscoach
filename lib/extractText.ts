// Client-side document text extraction. Everything runs in the browser —
// the file is never uploaded to a server, consistent with the zero-retention
// design documented on /security.

const PDF_EXTENSIONS = ['.pdf']
const DOCX_EXTENSIONS = ['.docx']
const TEXT_EXTENSIONS = ['.txt', '.md', '.text']

export const ACCEPTED_EXTENSIONS = [
  ...PDF_EXTENSIONS,
  ...DOCX_EXTENSIONS,
  ...TEXT_EXTENSIONS,
]

export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20MB

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() })
  try {
    const doc = await loadingTask.promise
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const line = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      pages.push(line)
    }
    return pages.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  })
  return result.value
}

/**
 * Extract plain text from a PDF, DOCX, or plain-text file, entirely in the
 * browser. Throws with a user-facing message on unsupported or unreadable
 * files.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File is larger than 20MB. Try a smaller document.')
  }

  const ext = extensionOf(file.name)

  let text: string
  if (PDF_EXTENSIONS.includes(ext)) {
    text = await extractPdf(file)
  } else if (DOCX_EXTENSIONS.includes(ext)) {
    text = await extractDocx(file)
  } else if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
    text = await file.text()
  } else if (ext === '.doc') {
    throw new Error(
      'Legacy .doc files are not supported. Save it as .docx or PDF and try again.'
    )
  } else {
    throw new Error('Unsupported file type. Use PDF, DOCX, or TXT.')
  }

  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim()
  if (!cleaned) {
    throw new Error(
      'No text could be extracted. If this is a scanned PDF, paste the text instead.'
    )
  }
  return cleaned
}
