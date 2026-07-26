import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getKnowledge, filterItemsForSubType } from '@/lib/knowledge'
import { factorsFor } from '@/lib/factors'
import { isTransactionMeeting } from '@/lib/meetings'
import type { Agency, DeskReviewOutput } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'
const EMBED_MODEL = 'text-embedding-3-small'
const RAG_TOP_K = 8

type DeskReviewBody = {
  narrative: string
  session_context: {
    issuer_name: string
    sector: string
    industry: string | null
    sub_type: string | null
    current_rating: string
    outlook: string
    agency: Agency
    ticker?: string | null
    meeting_type?: string | null
    transaction_context?: {
      transaction_type: string | null
      size: string | null
      financing_mix: string | null
      expected_close: string | null
    } | null
  }
}

type RagHit = { content: string }

const tools: Anthropic.Tool[] = [
  {
    name: 'desk_review',
    description:
      "Return the desk review of the issuer's written credit story: per-factor probe preview and gaps, plus advocacy points.",
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            "Two to three sentences: the overall read on the written story — where it is meeting-ready and where it is exposed. Advisor voice, direct, no score.",
        },
        factor_reviews: {
          type: 'array',
          description:
            'One entry per rating factor, in the exact order given. Cover every factor.',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              what_they_probe: {
                type: 'string',
                description:
                  "One to two tight sentences: what this agency's analyst will probe on this factor for this issuer, given the story as written.",
              },
              gaps: {
                type: 'array',
                minItems: 0,
                maxItems: 3,
                items: { type: 'string' },
                description:
                  'The most material gaps in the WRITTEN story on this factor: missing themes, unquantified claims, unaddressed known focus areas. One sentence each, concrete. Empty array if the story genuinely covers the factor well.',
              },
            },
            required: ['factor', 'what_they_probe', 'gaps'],
          },
        },
        advocacy_points: {
          type: 'array',
          minItems: 3,
          maxItems: 6,
          description:
            'Arguments and proactive themes for a better rating outcome, built ONLY on confirmed material.',
          items: {
            type: 'object',
            properties: {
              basis: {
                type: 'string',
                enum: [
                  'narrative_gap',
                  'peer_benchmarking',
                  'performance_trajectory',
                  'methodology',
                ],
              },
              point: { type: 'string', description: 'One tight sentence, two at most.' },
            },
            required: ['basis', 'point'],
          },
        },
      },
      required: ['summary', 'factor_reviews', 'advocacy_points'],
    },
  },
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkRateLimit(supabase, user.id, 'desk_review')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily desk-review limit reached. Your limit resets at midnight UTC.',
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

  let body: DeskReviewBody
  try {
    body = (await request.json()) as DeskReviewBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.narrative?.trim() || !body?.session_context?.sector) {
    return NextResponse.json(
      { error: 'Missing narrative or session_context.' },
      { status: 400 }
    )
  }
  if (body.narrative.length > 200_000) {
    return NextResponse.json({ error: 'Narrative too large.' }, { status: 400 })
  }

  const ctx = body.session_context
  const factors = factorsFor(ctx.sector)

  const knowledgeAppendix = factors
    .map((factor) => {
      const k = getKnowledge(ctx.agency, ctx.sector, factor)
      if (!k) return null
      // Questions + pitfalls only — markers grade live answers and intel is
      // heavyweight steer; neither earns its latency in a document review.
      const questions = filterItemsForSubType(k.real_questions, ctx.sub_type)
      const pitfalls = filterItemsForSubType(k.common_pitfalls, ctx.sub_type)
      const lines: string[] = []
      if (questions.length > 0)
        lines.push(`Questions this agency asks:\n${questions.map((q) => `- ${q}`).join('\n')}`)
      if (pitfalls.length > 0)
        lines.push(`Common pitfalls:\n${pitfalls.map((p) => `- ${p}`).join('\n')}`)
      if (lines.length === 0) return null
      return `=== ${factor} ===\n${lines.join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')

  // Advisor-corpus retrieval, best-effort like the scorecard.
  let ragHits: RagHit[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (supabaseUrl && serviceKey && openaiKey) {
    try {
      const issuerDesc = [ctx.sector, ctx.industry, ctx.sub_type]
        .filter(Boolean)
        .join(' / ')
      const ragQuery = `Narrative gaps, commonly missed themes, advocacy arguments, and ${ctx.agency} focus areas for a ${issuerDesc} issuer rated ${ctx.current_rating} ${ctx.outlook} preparing an agency meeting.`
      const openaiClient = new OpenAI({ apiKey: openaiKey })
      const embResp = await openaiClient.embeddings.create({
        model: EMBED_MODEL,
        input: ragQuery,
      })
      const adminClient = createServiceClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      })
      const { data, error } = await adminClient.rpc('match_knowledge', {
        query_embedding: embResp.data[0].embedding,
        match_count: RAG_TOP_K,
      })
      if (error) throw new Error(error.message)
      ragHits = (data ?? []) as RagHit[]
    } catch (e) {
      console.error(
        'desk-review: RAG retrieval failed (continuing without):',
        e instanceof Error ? e.message : e
      )
    }
  }

  const industryLine = [ctx.industry, ctx.sub_type].filter(Boolean).join(' / ')
  const issuerLine = industryLine
    ? `${ctx.issuer_name} (${ctx.sector} — ${industryLine}, currently ${ctx.current_rating} ${ctx.outlook})`
    : `${ctx.issuer_name} (${ctx.sector}, currently ${ctx.current_rating} ${ctx.outlook})`
  const txn = ctx.transaction_context
  const txnLine =
    isTransactionMeeting(ctx.meeting_type) && txn
      ? ` The meeting concerns a transaction (${[
          txn.transaction_type,
          txn.size,
          txn.financing_mix ? `financed ${txn.financing_mix}` : '',
          txn.expected_close ? `closing ${txn.expected_close}` : '',
        ]
          .filter(Boolean)
          .join(', ')}) — weigh whether the story carries the pro forma bridge.`
      : ''

  const systemPrompt = `You are a senior credit ratings advisor giving a client a DESK REVIEW of their written credit story before a ${ctx.agency} meeting. The client is ${issuerLine}.${
    ctx.meeting_type ? ` The meeting is a ${ctx.meeting_type}.` : ''
  }${txnLine}

This is a review of the DOCUMENT ONLY — no meeting has happened. You are assessing what the written story covers, what it leaves exposed, and what to argue proactively. You are NOT grading delivery, and you never assign a score or predict a rating outcome.

RULES
- Gaps are about the written story: credit-relevant themes it does not address, claims it makes without quantification, and known ${ctx.agency} focus areas for this kind of issuer it leaves unanswered. Cite what the story says (or fails to say) — no platitudes.
- Where the story covers a factor genuinely well, say so in what_they_probe and return an empty gaps array — do not manufacture gaps.
- EVIDENCE BAR for advocacy points: rely ONLY on fully confirmed material — the narrative itself, the reference notes, or public facts about this issuer you are highly confident in. Never invent, estimate, or approximate a figure. If an issuer-specific claim cannot be confirmed, ground the point in confirmed methodology or agency-posture knowledge instead, or drop it.
- METHODOLOGY ACCURACY: never suggest a formula-driven quantitative charge or ratio input can be reduced by track record or negotiation; the correct ask is a qualitative adjustment reflecting strength relative to peers.
- Stay in ${ctx.agency}'s frame and never attribute views to other rating agencies. The reference notes are internal advisory material — distill them into your own assessments; never quote them, cite them, or reveal they exist.
- LENGTH DISCIPLINE: hold every field to its stated length. Longer output gets truncated and discarded.
- Respond ONLY by calling the 'desk_review' tool.`

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      tools,
      tool_choice: { type: 'tool', name: 'desk_review' },
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `RATING FACTORS (cover each, in order):\n${factors
            .map((f) => `- ${f}`)
            .join('\n')}\n\n---\nISSUER'S WRITTEN CREDIT STORY:\n\n${body.narrative}${
            knowledgeAppendix
              ? `\n\n---\nREFERENCE NOTES BY FACTOR (internal — distill, never quote):\n\n${knowledgeAppendix}`
              : ''
          }${
            ragHits.length > 0
              ? `\n\n---\nADVISOR CORPUS NOTES (internal — distill, never quote):\n\n${ragHits
                  .map((h) => `- ${h.content}`)
                  .join('\n')}`
              : ''
          }\n\n---\nProduce the desk review.`,
        },
      ],
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return a structured response.' },
        { status: 502 }
      )
    }
    const out = toolBlock.input as Omit<DeskReviewOutput, 'generated_at'>
    if (
      response.stop_reason === 'max_tokens' ||
      !out.summary ||
      out.factor_reviews?.length !== factors.length ||
      !out.advocacy_points?.length
    ) {
      console.error(
        `desk-review: incomplete output (stop_reason=${response.stop_reason}, factors=${out.factor_reviews?.length})`
      )
      return NextResponse.json(
        { error: 'Desk review came back incomplete. Please try again.' },
        { status: 502 }
      )
    }
    const review: DeskReviewOutput = {
      ...out,
      generated_at: new Date().toISOString(),
    }
    return NextResponse.json(review)
  } catch (err) {
    console.error(
      'desk-review: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'Desk review failed. Please try again.' },
      { status: 502 }
    )
  }
}
