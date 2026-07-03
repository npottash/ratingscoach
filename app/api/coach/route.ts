import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { PERSONAS } from '@/lib/personas'
import { factorsFor } from '@/lib/factors'
import {
  getKnowledge,
  filterItemsForSubType,
  loadPlaybook,
} from '@/lib/knowledge'
import type { Agency } from '@/lib/types'

const CHAT_MODEL = 'claude-sonnet-4-6'
const EMBED_MODEL = 'text-embedding-3-small'
const RAG_TOP_K = 6
const MAX_TOKENS = 1024

type CoachTurn = { role: 'user' | 'assistant'; content: string }

type FactorResult = {
  factor: string
  flags: Array<'strong' | 'weak' | 'critical_gap' | 'none'>
  turns: Array<{ role: 'user' | 'assistant'; content: string; factor: string }>
}

type CoachBody = {
  question: string
  history: CoachTurn[]
  session_context: {
    issuer_name: string
    sector: string
    industry: string | null
    sub_type: string | null
    current_rating: string
    outlook: string
    agency: Agency
  }
  session_results?: FactorResult[]
}

type RagHit = {
  id: string
  content: string
  category: string
  tags: string[] | null
  similarity: number
}

export async function POST(request: Request) {
  // Auth gate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkRateLimit(supabase, user.id, 'coach')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily coach question limit reached. Your limit resets at midnight UTC.',
      },
      { status: 429 }
    )
  }

  // Required env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!supabaseUrl || !serviceKey || !openaiKey) {
    return NextResponse.json(
      { error: 'Server env missing (supabase URL/service key, openai key).' },
      { status: 500 }
    )
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  // Parse body
  let body: CoachBody
  try {
    body = (await request.json()) as CoachBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.question?.trim() || !body?.session_context) {
    return NextResponse.json(
      { error: 'Missing question or session_context.' },
      { status: 400 }
    )
  }

  const ctx = body.session_context

  // 1. Embed the question
  const openai = new OpenAI({ apiKey: openaiKey })
  let queryEmbedding: number[]
  try {
    const embResp = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: body.question,
    })
    queryEmbedding = embResp.data[0].embedding
  } catch (e) {
    console.error(
      'coach: embedding failed:',
      e instanceof Error ? e.message : e
    )
    return NextResponse.json(
      { error: 'The coach is briefly unavailable. Please try again.' },
      { status: 502 }
    )
  }

  // 2. Vector search against knowledge_base via match_knowledge() SQL fn
  const adminClient = createServiceClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
  let ragHits: RagHit[] = []
  try {
    const { data, error } = await adminClient.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_count: RAG_TOP_K,
    })
    if (error) throw new Error(error.message)
    ragHits = (data ?? []) as RagHit[]
  } catch (e) {
    // Non-fatal — proceed without RAG. Log and continue.
    console.error('Vector search failed:', e)
  }

  // 3. Load structured cells for sector x agency x all factors
  const factors = factorsFor(ctx.sector)
  const structuredBlocks = factors
    .map((factor) => {
      const cell = getKnowledge(ctx.agency, ctx.sector, factor)
      if (!cell) return null
      const qs = filterItemsForSubType(cell.real_questions, ctx.sub_type)
      const pits = filterItemsForSubType(cell.common_pitfalls, ctx.sub_type)
      const mks = filterItemsForSubType(cell.strong_answer_markers, ctx.sub_type)
      const intel = filterItemsForSubType(cell.agency_intel, ctx.sub_type)
      const parts: string[] = []
      if (qs.length) parts.push(`Real questions:\n${qs.map((q) => `- ${q}`).join('\n')}`)
      if (pits.length) parts.push(`Common pitfalls:\n${pits.map((p) => `- ${p}`).join('\n')}`)
      if (mks.length) parts.push(`Strong-answer markers:\n${mks.map((m) => `- ${m}`).join('\n')}`)
      if (intel.length) parts.push(`Agency intel:\n${intel.map((i) => `- ${i}`).join('\n')}`)
      if (parts.length === 0) return null
      return `### ${factor}\n${parts.join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')

  // 4. Playbook for outlook
  const playbook = loadPlaybook(ctx.outlook)

  // 5. Session results context (compact form: factor → flags + key user answers)
  const resultsBlock = (body.session_results ?? [])
    .map((r) => {
      const flagsLine = r.flags.length ? r.flags.join(', ') : 'none'
      const userAnswers = r.turns
        .filter((t) => t.role === 'user')
        .map((t) => `- ${t.content}`)
        .join('\n')
      return `### ${r.factor}\nFlags: ${flagsLine}\nIssuer's answers:\n${userAnswers || '- (none)'}`
    })
    .join('\n\n')

  const ragBlock = ragHits
    .map(
      (hit, i) =>
        `### Chunk ${i + 1} (similarity ${hit.similarity.toFixed(3)}, source: ${hit.category})\n${hit.content}`
    )
    .join('\n\n')

  // 6. System prompt
  const persona = PERSONAS[ctx.agency]
  const industryLine = [ctx.industry, ctx.sub_type].filter(Boolean).join(' / ')
  const issuerDescriptor = industryLine
    ? `${ctx.issuer_name} (${ctx.sector} — ${industryLine}, currently ${ctx.current_rating} ${ctx.outlook}, prepping for ${ctx.agency})`
    : `${ctx.issuer_name} (${ctx.sector}, currently ${ctx.current_rating} ${ctx.outlook}, prepping for ${ctx.agency})`

  const systemPrompt = `You are the AI Ratings Coach, an expert advisor sitting alongside a senior credit ratings consultant and their CFO / IR client. You just finished a simulated rating prep meeting between the client and a ${ctx.agency} analyst persona (${persona.name}).

The client is: ${issuerDescriptor}.

Your job is to answer the user's question using everything below: the simulation results, the proprietary knowledge overlay, the playbook for the current outlook, and retrieved advisor notes from the corpus. Be specific to THIS issuer's situation — do not give generic answers.

TONE
- Professional, expert, concise.
- Default to 2-5 sentences. Use short bullets for lists. Longer only if the question demands it.
- Reference the issuer's specific factors, sub-type, and outlook when relevant.
- If the answer requires information you don't have, say so honestly rather than inventing.

SESSION RESULTS (from the simulation just completed)
${resultsBlock || '(no per-factor transcript provided)'}

PROPRIETARY KNOWLEDGE OVERLAY (for ${ctx.agency} × ${ctx.sector}${ctx.sub_type ? ` × ${ctx.sub_type}` : ''})
${structuredBlocks || '(no structured cells populated for this combination)'}

${
  playbook
    ? `ADVISORY PLAYBOOK FOR CURRENT OUTLOOK (${ctx.outlook})\n${playbook.recommended_actions.map((a) => `- ${a}`).join('\n')}\n\n`
    : ''
}RETRIEVED ADVISOR NOTES (from the corpus, ranked by relevance to the user's question)
${ragBlock || '(no relevant chunks retrieved)'}

Answer the user's question directly using the above. Do not list your sources unless asked.`

  // 7. Call Claude
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        ...body.history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user' as const, content: body.question },
      ],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text in response' },
        { status: 502 }
      )
    }
    return NextResponse.json({ answer: textBlock.text })
  } catch (e) {
    console.error(
      'coach: model call failed:',
      e instanceof Error ? e.message : e
    )
    return NextResponse.json(
      { error: 'The coach is briefly unavailable. Please try again.' },
      { status: 502 }
    )
  }
}
