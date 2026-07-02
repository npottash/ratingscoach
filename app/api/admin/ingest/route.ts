import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const CHUNK_MODEL = 'claude-sonnet-4-6'
const EMBED_MODEL = 'text-embedding-3-small'
const MAX_TOKENS = 4096

type IngestBody = {
  text: string
  category: string
  agency: string
  sector: string
}

type ChunkedOutput = {
  chunks: Array<{
    content: string
    tags: string[]
  }>
}

function isAdminEmail(email: string | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return admin.trim().toLowerCase() === email.trim().toLowerCase()
}

const tools: Anthropic.Tool[] = [
  {
    name: 'chunk_text',
    description:
      'Clean raw advisor notes and split into knowledge-base chunks of 300-500 words each. Generate 3-7 short topical tags per chunk.',
    input_schema: {
      type: 'object',
      properties: {
        chunks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description:
                  'A cleaned 300-500 word segment. Preserve voice and substance; fix punctuation, capitalization, and obvious dictation slips. Do not paraphrase.',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Three to seven short topical tags (e.g. "capital adequacy", "AOCI", "CCAR"). Lowercase.',
              },
            },
            required: ['content', 'tags'],
          },
        },
      },
      required: ['chunks'],
    },
  },
]

const CHUNK_SYSTEM_PROMPT = `You are processing raw advisor notes for a credit-rating advisory knowledge base. Your job:

1. Clean the text. Fix punctuation, capitalization, and obvious dictation slips. Preserve the advisor's voice, jargon, and substance exactly. Do not paraphrase, summarize, restructure, or add framing.

2. Split the cleaned text into segments of approximately 300-500 words each, at natural topical boundaries. A short input may be a single chunk. A long input may be many chunks.

3. For each chunk, generate 3-7 short topical tags. Lowercase, keyword-style. Examples: "aoci", "ccar", "capital adequacy", "deposit beta".

Respond ONLY by calling the chunk_text tool.`

export async function POST(request: Request) {
  // 1. Auth gate — signed in AND admin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Env validation
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

  // 3. Body validation
  let body: IngestBody
  try {
    body = (await request.json()) as IngestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { text, category, agency, sector } = body
  if (!text?.trim() || !category || !agency || !sector) {
    return NextResponse.json(
      { error: 'Missing required fields: text, category, agency, sector.' },
      { status: 400 }
    )
  }

  // 4. Chunk + clean via Claude
  let chunks: ChunkedOutput['chunks']
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: CHUNK_MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      tool_choice: { type: 'tool', name: 'chunk_text' },
      system: [
        {
          type: 'text',
          text: CHUNK_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text.trim() }],
    })
    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return structured chunks.' },
        { status: 502 }
      )
    }
    chunks = (toolBlock.input as ChunkedOutput).chunks ?? []
  } catch (err) {
    return NextResponse.json(
      {
        error: `Cleanup failed: ${err instanceof Error ? err.message : 'unknown'}`,
      },
      { status: 502 }
    )
  }

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: 'No chunks produced from input.' },
      { status: 400 }
    )
  }

  // 5. Embed via OpenAI (batched)
  let embeddings: number[][]
  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const resp = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: chunks.map((c) => c.content),
    })
    embeddings = resp.data.map((d) => d.embedding)
  } catch (err) {
    return NextResponse.json(
      {
        error: `Embedding failed: ${err instanceof Error ? err.message : 'unknown'}`,
      },
      { status: 502 }
    )
  }

  // 6. Insert via service role (bypass RLS)
  const admin = createServiceClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false },
  })

  const rows = chunks.map((c, i) => ({
    category,
    content: c.content,
    tags: c.tags,
    embedding: embeddings[i],
    agency,
    sector,
  }))

  const { error: insertErr } = await admin
    .from('knowledge_base')
    .insert(rows)

  if (insertErr) {
    return NextResponse.json(
      { error: `Insert failed: ${insertErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
