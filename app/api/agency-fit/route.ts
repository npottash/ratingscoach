import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getKnowledge, filterItemsForSubType } from '@/lib/knowledge'
import { factorsFor } from '@/lib/factors'
import type { Agency, AgencyFitOutput } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'
const EMBED_MODEL = 'text-embedding-3-small'
const RAG_TOP_K = 8
const AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

type FitContext = {
  issuer_name?: string | null
  sector: string
  industry?: string | null
  sub_type?: string | null
  current_rating?: string | null
  outlook?: string | null
  ticker?: string | null
  meeting_type?: string | null
}

type FitBody = {
  context: FitContext
  narrative?: string
  current_agency?: Agency
  /**
   * 'selection' (default): which agency should a debut issuer approach —
   * compares all three. 'second_rating': the issuer is already with
   * current_agency — how receptive would the other two be to providing an
   * additional rating.
   */
  purpose?: 'selection' | 'second_rating'
  /** Derived simulation results (flags, gaps, actions) — never the transcript. */
  scorecard_summary?: string
}

type RagHit = { content: string }

function toolsFor(agencies: Agency[], secondRating: boolean): Anthropic.Tool[] {
  const n = agencies.length
  return [
    {
      name: 'agency_fit',
      description: secondRating
        ? 'Return the second-rating receptiveness analysis for the other agencies.'
        : "Return the agency-fit analysis: a ranked comparison of S&P, Moody's, and Fitch for this issuer.",
      input_schema: {
        type: 'object',
        properties: {
          ranking: {
            type: 'array',
            minItems: n,
            maxItems: n,
            items: { type: 'string', enum: agencies },
            description: secondRating
              ? 'The candidate agencies, most receptive first.'
              : 'All three agencies, best fit first.',
          },
          recommendation_rationale: {
            type: 'string',
            description: secondRating
              ? 'Three to five sentences: whether and when adding a second rating makes sense for this issuer (investor-base and index considerations, incremental burden), and which agency to approach first. Grounded in the credit story and simulation results where provided. Plain prose, advisor voice.'
              : 'Two to four sentences: why the top-ranked agency fits this issuer best. Grounded in the credit story where one is provided, otherwise in the sector profile. Plain prose, advisor voice.',
          },
          comparison: {
            type: 'array',
            minItems: n,
            maxItems: n,
            description: 'One entry per agency, in ranking order.',
            items: {
              type: 'object',
              properties: {
                agency: { type: 'string', enum: agencies },
                methodology_take: {
                  type: 'string',
                  description: secondRating
                    ? "Two to three sentences: how this agency's framework would approach this issuer coming in for a fresh rating — what it weights, and how its read may differ from the current agency's."
                    : "Two to three sentences: how this agency's framework treats this kind of issuer — what it weights, where its criteria are mechanical vs. judgment-driven.",
                },
                constructive_signals: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 3,
                  items: { type: 'string' },
                  description:
                    'Where this agency tends to be constructive for this profile. One sentence each.',
                },
                watchouts: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 3,
                  items: { type: 'string' },
                  description:
                    'Where this agency probes hardest or tends to be tough for this profile. One sentence each.',
                },
                basis: {
                  type: 'string',
                  enum: ['tracked_intel', 'published_criteria'],
                  description:
                    "'tracked_intel' when the reference notes materially informed this entry; 'published_criteria' when it rests on published methodology knowledge because the notes are thin for this agency and sector.",
                },
              },
              required: [
                'agency',
                'methodology_take',
                'constructive_signals',
                'watchouts',
                'basis',
              ],
            },
          },
        },
        required: ['ranking', 'recommendation_rationale', 'comparison'],
      },
    },
  ]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkRateLimit(supabase, user.id, 'agency_fit')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily agency-fit limit reached. Your limit resets at midnight UTC.',
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

  let body: FitBody
  try {
    body = (await request.json()) as FitBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.context?.sector) {
    return NextResponse.json({ error: 'Missing context.sector.' }, { status: 400 })
  }
  if (body.narrative && body.narrative.length > 200_000) {
    return NextResponse.json({ error: 'Narrative too large.' }, { status: 400 })
  }
  if (body.scorecard_summary && body.scorecard_summary.length > 50_000) {
    return NextResponse.json(
      { error: 'Scorecard summary too large.' },
      { status: 400 }
    )
  }

  const isSecondRating = body.purpose === 'second_rating'
  if (isSecondRating && !body.current_agency) {
    return NextResponse.json(
      { error: 'second_rating requires current_agency.' },
      { status: 400 }
    )
  }
  // Selection compares all three; second-rating only the agencies the issuer
  // is not already with.
  const candidates = isSecondRating
    ? AGENCIES.filter((a) => a !== body.current_agency)
    : AGENCIES

  const ctx = body.context
  const factors = factorsFor(ctx.sector)
  const issuerDesc = [ctx.sector, ctx.industry, ctx.sub_type]
    .filter(Boolean)
    .join(' / ')

  // Reference notes for ALL THREE agencies — this is the one feature that
  // reads across agencies. Output must distill; raw notes never leave the
  // server.
  const digests = candidates.map((agency) => {
    const blocks = factors
      .map((factor) => {
        const k = getKnowledge(agency, ctx.sector, factor)
        if (!k) return null
        const intel = filterItemsForSubType(k.agency_intel, ctx.sub_type ?? null)
        const questions = filterItemsForSubType(
          k.real_questions,
          ctx.sub_type ?? null
        )
        const lines: string[] = []
        if (intel.length > 0)
          lines.push(`Intel:\n${intel.map((i) => `- ${i}`).join('\n')}`)
        if (questions.length > 0)
          lines.push(
            `Questions they ask:\n${questions.map((q) => `- ${q}`).join('\n')}`
          )
        if (lines.length === 0) return null
        return `-- ${factor} --\n${lines.join('\n')}`
      })
      .filter((s): s is string => s !== null)
    return {
      agency,
      hasIntel: blocks.length > 0,
      text: blocks.length > 0 ? blocks.join('\n\n') : '(no tracked notes)',
    }
  })

  // Advisor-corpus retrieval, best-effort like the scorecard.
  let ragHits: RagHit[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (supabaseUrl && serviceKey && openaiKey) {
    try {
      const ragQuery = isSecondRating
        ? `Adding a second rating for a ${issuerDesc} issuer already rated by ${body.current_agency}: how ${candidates.join(' and ')} approach this sector, methodology differences, receptiveness, dual-rating considerations.`
        : `Choosing between S&P, Moody's and Fitch for a ${issuerDesc} issuer${
            ctx.current_rating ? ` rated ${ctx.current_rating}` : ''
          } seeking a first rating: agency methodology differences, constructiveness, sector treatment, criteria emphasis.`
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
        'agency-fit: RAG retrieval failed (continuing without):',
        e instanceof Error ? e.message : e
      )
    }
  }

  const hasNarrative = Boolean(body.narrative?.trim())
  const issuerBit = ctx.issuer_name ? `${ctx.issuer_name}, a` : 'A'
  const ratingBit = ctx.current_rating
    ? ` currently ${ctx.current_rating}${ctx.outlook ? ` ${ctx.outlook}` : ''}`
    : ''

  const hasScorecard = Boolean(body.scorecard_summary?.trim())

  const systemPrompt = isSecondRating
    ? `You are a senior credit ratings advisor. ${issuerBit} ${issuerDesc} issuer${ratingBit} works with ${body.current_agency} today and is asking whether to seek an additional rating from another agency.

Produce the SECOND-RATING RECEPTIVENESS ANALYSIS for ${candidates.join(' and ')}.

RULES
- This is a receptiveness and fit assessment, not a rating prediction. Never predict the rating level another agency would assign, and never suggest an agency would rate higher or lower than ${body.current_agency} — frame differences as what each agency emphasizes and probes.
- The rationale must address the real decision: what a second rating typically buys (broader investor mandates and index eligibility often require two ratings), what it costs (fees, a second annual cycle, a second surveillance relationship), and — only if the profile supports a view — which agency to approach first and when.
- ${
        hasNarrative || hasScorecard
          ? 'Ground the analysis in the materials provided (credit story and/or simulation results): weigh the profile’s demonstrated strengths and flagged gaps against what each candidate agency rewards and probes. Cite specifics.'
          : 'No credit story or simulation results are available — this is a PRELIMINARY sector-level view. Keep it honest about that.'
      }
- The reference notes are internal advisory material. Distill them into your own assessments — never quote them, cite them, or reveal they exist. Set basis to 'tracked_intel' where they materially informed an entry, 'published_criteria' otherwise.
- Be balanced: every agency gets genuine constructive signals AND genuine watchouts.
- LENGTH DISCIPLINE: keep every field within its stated length.
- Respond ONLY by calling the 'agency_fit' tool.`
    : `You are a senior credit ratings advisor helping ${issuerBit} ${issuerDesc} issuer${ratingBit} decide which rating agency to approach${
        ctx.meeting_type === 'New Rating Request' ? ' for its first rating' : ''
      }.

Produce the AGENCY-FIT ANALYSIS comparing S&P, Moody's, and Fitch for this issuer.

RULES
- This is a fit assessment, not a rating prediction. Compare how each agency's methodology and sector posture align with this issuer's profile. Never predict a rating level or promise an outcome at any agency.
- ${
        hasNarrative
          ? 'Ground the analysis in the credit story provided: identify its concrete strengths and soft spots, and weigh them against what each agency rewards and probes. The rationale should cite specifics from the story.'
          : 'No credit story is available yet — this is a PRELIMINARY sector-level comparison. Keep it honest about that: the analysis reflects the issuer type, not this issuer.'
      }
- The reference notes are internal advisory material. Distill them into your own assessments — never quote them, cite them, or reveal they exist. Set basis to 'tracked_intel' where they materially informed an entry, 'published_criteria' where they are thin and you relied on published methodology knowledge instead.
- Be balanced: every agency gets genuine constructive signals AND genuine watchouts. If the fit is close, say so in the rationale rather than manufacturing separation.
- LENGTH DISCIPLINE: keep every field within its stated length.
- Respond ONLY by calling the 'agency_fit' tool.`

  const digestBlock = digests
    .map((d) => `=== ${d.agency} ===\n${d.text}`)
    .join('\n\n')
  const ragBlock =
    ragHits.length > 0
      ? `\n\n---\nADVISOR CORPUS NOTES (internal — distill, never quote):\n\n${ragHits
          .map((h) => `- ${h.content}`)
          .join('\n')}`
      : ''
  const narrativeBlock = hasNarrative
    ? `\n\n---\nISSUER'S CREDIT STORY:\n\n${body.narrative}`
    : ''
  const scorecardBlock = hasScorecard
    ? `\n\n---\nSIMULATION RESULTS (from a simulated ${body.current_agency ?? 'agency'} meeting):\n\n${body.scorecard_summary}`
    : ''
  const currentBit =
    body.current_agency && !isSecondRating
      ? `\n\nThe issuer currently has ${body.current_agency} selected.`
      : ''
  const ask = isSecondRating
    ? 'Produce the second-rating receptiveness analysis.'
    : 'Produce the agency-fit analysis.'

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: toolsFor(candidates, isSecondRating),
      tool_choice: { type: 'tool', name: 'agency_fit' },
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `REFERENCE NOTES BY AGENCY (internal — distill, never quote):\n\n${digestBlock}${ragBlock}${narrativeBlock}${scorecardBlock}${currentBit}\n\n---\n${ask}`,
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
    const out = toolBlock.input as Omit<AgencyFitOutput, 'preliminary'>
    if (
      response.stop_reason === 'max_tokens' ||
      out.ranking?.length !== candidates.length ||
      out.comparison?.length !== candidates.length ||
      !out.recommendation_rationale ||
      new Set(out.ranking).size !== candidates.length
    ) {
      console.error(
        `agency-fit: incomplete output (stop_reason=${response.stop_reason})`
      )
      return NextResponse.json(
        { error: 'Agency-fit analysis came back incomplete. Please try again.' },
        { status: 502 }
      )
    }
    const result: AgencyFitOutput = {
      ...out,
      preliminary: !hasNarrative && !hasScorecard,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error(
      'agency-fit: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'Agency-fit analysis failed. Please try again.' },
      { status: 502 }
    )
  }
}
