import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const EMBED_MODEL = 'text-embedding-3-small'
const CLEANUP_MODEL = 'claude-sonnet-4-6'
const CHUNK_WORDS = 500

const CLEANUP_SYSTEM = `You are a transcription typewriter, NOT an editor. You will receive raw text from voice dictation by a senior credit ratings advisor. Your job:

- Fix punctuation and capitalization.
- Fix obvious dictation slips (homophones, missing periods, broken sentence boundaries).
- Preserve the speaker's voice, jargon, and phrasing EXACTLY.
- Do NOT paraphrase, restructure, summarize, reorganize, or improve.
- Do NOT remove meaningful content. Filler words like "um" / "you know" can be dropped, but stay conservative.
- Do NOT add framing, headers, or preambles.

Return ONLY the cleaned text. No explanation, no quoting, no "Here is the cleaned text:".`

function chunkText(text: string, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const out: string[] = []
  for (let i = 0; i < words.length; i += size) {
    out.push(words.slice(i, i + size).join(' '))
  }
  return out
}

async function cleanupDictation(text: string): Promise<string> {
  const client = new Anthropic()
  const resp = await client.messages.create({
    model: CLEANUP_MODEL,
    max_tokens: Math.min(4096, Math.max(512, Math.ceil(text.length * 1.2))),
    system: CLEANUP_SYSTEM,
    messages: [{ role: 'user', content: text }],
  })
  const block = resp.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('Cleanup returned no text block')
  }
  return block.text.trim()
}

export async function POST(request: Request) {
  // 1. Shared-secret auth (iOS Shortcut sends this header)
  const expectedSecret = process.env.STREAM_INGEST_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'STREAM_INGEST_SECRET not configured on server.' },
      { status: 500 }
    )
  }
  const providedSecret = request.headers.get('x-stream-secret')
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate other env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!openaiKey) missing.push('OPENAI_API_KEY')
  if (!anthropicKey) missing.push('ANTHROPIC_API_KEY')
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Server env missing: ${missing.join(', ')}` },
      { status: 500 }
    )
  }

  // 3. Parse body
  let body: { text?: string; skip_cleanup?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const rawText = (body.text ?? '').trim()
  if (!rawText) {
    return NextResponse.json({ error: 'Missing or empty text' }, { status: 400 })
  }

  // 4. Cleanup pass (default on; skip_cleanup=true bypasses)
  let cleaned = rawText
  let wasCleaned = false
  if (!body.skip_cleanup) {
    try {
      cleaned = await cleanupDictation(rawText)
      wasCleaned = true
    } catch (e) {
      // Cleanup failure must not lose the stream — fall back to raw.
      console.error('Cleanup failed, storing raw:', e)
      cleaned = rawText
    }
  }

  // 5. Chunk + embed + insert
  const chunks = chunkText(cleaned, CHUNK_WORDS)
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: 'Nothing to ingest after cleanup' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false },
  })
  const openai = new OpenAI({ apiKey: openaiKey })

  const submittedAt = new Date().toISOString()

  try {
    const embedResp = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: chunks,
    })

    const rows = chunks.map((content, i) => ({
      category: 'stream',
      content,
      tags: [
        'stream',
        `submitted:${submittedAt}`,
        `chunk:${i}`,
        wasCleaned ? 'cleaned' : 'raw',
      ],
      embedding: embedResp.data[i].embedding,
    }))

    const { error: insertErr } = await supabase
      .from('knowledge_base')
      .insert(rows)
    if (insertErr) {
      return NextResponse.json(
        { error: `Insert failed: ${insertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      chunks: chunks.length,
      cleaned: wasCleaned,
      preview: cleaned.slice(0, 200),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
