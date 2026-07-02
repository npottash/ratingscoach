import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

// PDF transcription for the narrative upload flow. The document is sent to
// Claude for a faithful markdown transcription — tables reproduced as tables,
// charts described with their data — and is processed in memory only: nothing
// is written to disk, Supabase, or logs.

const MODEL = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 32000

// Vercel serverless request bodies cap at ~4.5MB, so the effective PDF limit
// is ~3MB (base64 inflates by ~33%). Enforce it here with a clear error.
const MAX_PDF_BYTES = 3 * 1024 * 1024

// Dense decks can take a while to transcribe.
export const maxDuration = 300

const SYSTEM_PROMPT = `You transcribe credit and financial documents to clean markdown with total fidelity. Rules:
- Reproduce every table as a markdown table with the exact figures, headers, units, and footnotes shown. Never round, omit rows, or summarize a table.
- For every chart or graph, state its title and type, then enumerate the data series and the values shown (read them from axis labels and data labels; if a value must be estimated from the plot, mark it with "~").
- Preserve the document's section structure with markdown headings.
- Transcribe text content faithfully. Do not analyze, editorialize, or add commentary.
- Output only the transcription — no preamble.`

type ExtractBody = {
  pdf_base64: string
  filename?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkRateLimit(supabase, user.id, 'extract')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily document extraction limit reached. Paste the text instead, or try again after midnight UTC.',
      },
      { status: 429 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: ExtractBody
  try {
    body = (await request.json()) as ExtractBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const pdfBase64 = body.pdf_base64
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return NextResponse.json(
      { error: 'pdf_base64 is required.' },
      { status: 400 }
    )
  }

  // Base64 length ≈ bytes × 4/3
  const approxBytes = Math.floor(pdfBase64.length * 0.75)
  if (approxBytes > MAX_PDF_BYTES) {
    return NextResponse.json(
      {
        error:
          'PDF is larger than 3MB. Export a compressed version (or the relevant pages) and try again, or paste the text.',
      },
      { status: 413 }
    )
  }

  const anthropic = new Anthropic()

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Transcribe this document to markdown following your rules.',
            },
          ],
        },
      ],
    })

    const message = await stream.finalMessage()
    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    if (!text) {
      return NextResponse.json(
        { error: 'No content could be extracted from the document.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ text, truncated: message.stop_reason === 'max_tokens' })
  } catch (err) {
    console.error('extract failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Document extraction failed. Try again or paste the text.' },
      { status: 502 }
    )
  }
}
