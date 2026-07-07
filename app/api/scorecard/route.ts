import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { PERSONAS } from '@/lib/personas'
import {
  getKnowledge,
  filterItemsForSubType,
  loadPlaybook,
} from '@/lib/knowledge'
import type { Agency } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'
const EMBED_MODEL = 'text-embedding-3-small'
const RAG_TOP_K = 6

type Flag = 'strong' | 'adequate' | 'weak' | 'critical_gap' | 'none'

type Turn = { role: 'user' | 'assistant'; content: string; factor: string }

type FactorResult = {
  factor: string
  flags: Flag[]
  turns: Turn[]
}

type ScorecardBody = {
  results: FactorResult[]
  narrative?: string
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
    meeting_date?: string | null
  }
}

type AdvocacyBasis =
  | 'narrative_gap'
  | 'peer_benchmarking'
  | 'performance_trajectory'
  | 'methodology'

type ScorecardOutput = {
  factor_analyses: Array<{
    factor: string
    handled_well: string
    flagged: string
    recommended_action: string
  }>
  committee_memo: string
  priority_actions: string[]
  advocacy_points: Array<{
    basis: AdvocacyBasis
    point: string
  }>
}

type RagHit = {
  id: string
  content: string
  category: string
  tags: string[] | null
  similarity: number
}

const tools: Anthropic.Tool[] = [
  {
    name: 'scorecard',
    description:
      'Produce a structured rating-readiness scorecard for the issuer based on the simulation transcripts.',
    input_schema: {
      type: 'object',
      properties: {
        factor_analyses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              handled_well: {
                type: 'string',
                description:
                  'One to two sentences on what the issuer handled well on this factor. Be specific.',
              },
              flagged: {
                type: 'string',
                description:
                  'One to two sentences on what was weak or a critical gap on this factor. If the factor was strong throughout, state that.',
              },
              recommended_action: {
                type: 'string',
                description:
                  'A single specific action the issuer should take before the real meeting to address the weakest point on this factor.',
              },
            },
            required: [
              'factor',
              'handled_well',
              'flagged',
              'recommended_action',
            ],
          },
        },
        committee_memo: {
          type: 'string',
          description:
            'Four to six sentences of plain prose, written in the voice of the analyst summarizing the credit for an internal rating committee. Cite the strongest and weakest factors. Land on a clear directional take.',
        },
        priority_actions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Exactly three prep actions, ordered by priority. Each one short and concrete.',
        },
        advocacy_points: {
          type: 'array',
          minItems: 4,
          maxItems: 6,
          description:
            'Four to six narrative gaps and advocacy arguments the issuer should raise with the agency to strengthen their credit story. Every point must rest ONLY on fully confirmed data — the narrative, the transcript, the reference notes, or public facts about this issuer you are highly confident in. Never invent or approximate a figure. If issuer-specific evidence is thin, ground the point in confirmed methodology or agency-posture knowledge instead.',
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
                description:
                  "Which lens the point comes from. 'narrative_gap': a credit-relevant topic clearly missing from the narrative materials that the issuer should be addressing proactively. 'peer_benchmarking': a dimension where this issuer excels relative to what is typical of higher-rated issuers. 'performance_trajectory': a metric or position where the issuer has outperformed its own history while the rating has not moved in line. 'methodology': a place where the methodology unfairly penalizes the issuer or, applied faithfully, should point to a better outcome. Methodology points must be methodology-accurate: formula-driven quantitative charges (e.g. S&P's RAC operational-risk charge) cannot be argued down by issuer track record — where a confirmed strength is not captured by the quantitative framework, advocate for a qualitative or comparable-ratings adjustment reflecting strength relative to peers instead.",
              },
              point: {
                type: 'string',
                description:
                  'One to two sentences. Short, concise, concrete — an argument the CFO/IR team can make to the agency verbatim.',
              },
            },
            required: ['basis', 'point'],
          },
        },
      },
      required: [
        'factor_analyses',
        'committee_memo',
        'priority_actions',
        'advocacy_points',
      ],
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

  const allowed = await checkRateLimit(supabase, user.id, 'scorecard')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily scorecard limit reached. Your limit resets at midnight UTC.',
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

  let body: ScorecardBody
  try {
    body = (await request.json()) as ScorecardBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.results?.length || !body?.session_context) {
    return NextResponse.json(
      { error: 'Missing results or session_context.' },
      { status: 400 }
    )
  }

  // Bound the cost of a single call. ~200k chars ≈ 50k tokens of narrative.
  if (body.narrative && body.narrative.length > 200_000) {
    return NextResponse.json(
      { error: 'Narrative too large.' },
      { status: 400 }
    )
  }

  const persona = PERSONAS[body.session_context.agency]
  const ctx = body.session_context

  // Retrieve advisor-corpus notes to ground the narrative gap / advocacy
  // analysis. Best-effort: the scorecard must still generate if embeddings
  // or vector search are unavailable.
  let ragHits: RagHit[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (supabaseUrl && serviceKey && openaiKey) {
    try {
      const weakFactors = body.results
        .filter((r) =>
          r.flags.some((f) => f === 'weak' || f === 'critical_gap')
        )
        .map((r) => r.factor)
      const issuerDesc = [ctx.sector, ctx.industry, ctx.sub_type]
        .filter(Boolean)
        .join(' / ')
      const ragQuery = [
        `Arguments for a better rating outcome and commonly missed narrative topics for a ${issuerDesc} issuer rated ${ctx.current_rating} ${ctx.outlook} preparing for ${ctx.agency}.`,
        weakFactors.length
          ? `Factors flagged weak in simulation: ${weakFactors.join(', ')}.`
          : '',
        'Peer benchmarking versus higher-rated issuers, methodology treatment, upgrade drivers, themes agencies expect issuers to address.',
      ]
        .filter(Boolean)
        .join(' ')
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
        'scorecard: RAG retrieval failed (continuing without):',
        e instanceof Error ? e.message : e
      )
    }
  }

  const transcript = body.results
    .map((r) => {
      const flagsLine = r.flags.length
        ? `Flags: ${r.flags.join(', ')}`
        : 'Flags: none'
      const turnsBlock = r.turns
        .map(
          (t) =>
            `${t.role === 'assistant' ? `${persona.name} (analyst)` : 'Issuer'}: ${t.content}`
        )
        .join('\n')
      return `=== ${r.factor} ===\n${flagsLine}\n${turnsBlock}`
    })
    .join('\n\n')

  const knowledgeAppendix = body.results
    .map((r) => {
      const k = getKnowledge(ctx.agency, ctx.sector, r.factor)
      if (!k) return null
      const pitfalls = filterItemsForSubType(k.common_pitfalls, ctx.sub_type)
      const markers = filterItemsForSubType(k.strong_answer_markers, ctx.sub_type)
      const intel = filterItemsForSubType(k.agency_intel, ctx.sub_type)
      const lines: string[] = []
      if (pitfalls.length > 0) {
        lines.push(
          `Common pitfalls on this factor:\n${pitfalls.map((p) => `- ${p}`).join('\n')}`
        )
      }
      if (markers.length > 0) {
        lines.push(
          `Markers of a strong answer on this factor:\n${markers.map((m) => `- ${m}`).join('\n')}`
        )
      }
      if (intel.length > 0) {
        lines.push(
          `${ctx.agency} intel for this factor:\n${intel.map((i) => `- ${i}`).join('\n')}`
        )
      }
      if (lines.length === 0) return null
      return `=== ${r.factor} ===\n${lines.join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')

  const industryLine = [ctx.industry, ctx.sub_type].filter(Boolean).join(' / ')
  const tickerBit = ctx.ticker ? `, ticker: ${ctx.ticker}` : ''
  const issuerLine = industryLine
    ? `${ctx.issuer_name} (${ctx.sector} — ${industryLine}${tickerBit}, currently ${ctx.current_rating} ${ctx.outlook})`
    : `${ctx.issuer_name} (${ctx.sector}${tickerBit}, currently ${ctx.current_rating} ${ctx.outlook})`

  // Days of prep runway until the real meeting, when a date is set and in
  // the future. Used to calibrate how ambitious the priority actions can be.
  let runwayLine = ''
  if (ctx.meeting_date) {
    const days = Math.ceil(
      (new Date(ctx.meeting_date).getTime() - Date.now()) / 86_400_000
    )
    if (Number.isFinite(days) && days >= 0) {
      runwayLine = `\n\nThe real ${ctx.agency} meeting is ${
        days === 0 ? 'TODAY' : `in ${days} day${days === 1 ? '' : 's'}`
      } (${ctx.meeting_date}). Calibrate priority_actions to that runway: every action must be realistically achievable before the meeting, with the most time-sensitive first. With a short runway, prefer sharpening existing materials and rehearsing answers over building new analyses from scratch.`
    }
  }

  const systemPrompt = `You are ${persona.name}, ${persona.role} at ${ctx.agency}. You are a fictional persona created for issuer prep — never claim to be a real person. You just finished a rating prep simulation with ${issuerLine}.

You will now produce a structured scorecard that the issuer's CFO / IR team will read to prepare for the real meeting.${
    ctx.meeting_type
      ? `\n\nThe simulated meeting type was: ${ctx.meeting_type}. Weigh readiness accordingly — for a New Rating Request, how well the issuer explained the business and its inherent credit risks matters most; for an Annual Review or Transaction Update, year-over-year movement, current events, and progress on known concerns matter most.`
      : ''
  }${runwayLine}

GUIDELINES
- Be specific. Cite what was actually said. No platitudes.
- LENGTH DISCIPLINE: hold every field to its stated length — one to two sentences for each factor field and each advocacy point, four to six sentences for the memo. Longer output gets truncated and discarded.
- "Handled well" must point to a concrete moment of strength. If nothing was strong on a factor, say so honestly.
- "Flagged" must call out the most material weakness — vague answer, missing detail, exposed risk.
- "Recommended action" is one concrete prep action — not "study more", but e.g. "have a sourced CET1 trajectory chart through Q4 2027 ready, with a binding-constraint label at each quarter".
- Committee memo: write as you would for an internal rating committee. Four to six sentences, plain prose, land on a directional take (e.g. "supports current rating", "outlook deterioration risk", "rating-action candidate if X").
- Priority actions: exactly three, ordered. Concrete. The most important first.
- Advocacy points: 4-6 short points combining two kinds of item. (a) Narrative gaps: credit-relevant themes clearly ABSENT from the issuer's narrative materials and answers — drawn from the reference notes, retrieved advisor notes, or well-established public context — that the issuer should be raising proactively with the agency. (b) Advocacy arguments for a better ratings outcome, each built on exactly one of three methods: high-level benchmarking where this issuer excels relative to what is typical of higher-rated issuers; outperformance versus the issuer's own history that the rating has not moved in line with; or methodology treatment that unfairly penalizes the issuer or, applied faithfully, should support a better outcome.
- EVIDENCE BAR for advocacy points: rely ONLY on fully confirmed data — the narrative, the transcript, the notes provided below, or public facts about this issuer you are highly confident in. Never invent, estimate, or approximate a figure. If you cannot confirm an issuer-specific claim, ground the point in confirmed methodology or agency-posture knowledge instead — or drop it for a stronger one.
- METHODOLOGY ACCURACY: never suggest a formula-driven quantitative charge or ratio input can be reduced by issuer track record or negotiation. Where a confirmed strength is not captured by the quantitative framework, the correct ask is a qualitative adjustment (or comparable-ratings/holistic adjustment) reflecting strength relative to peers.
- Stay in ${ctx.agency} voice and methodology. Never attribute views to other rating agencies — where reference notes cite another agency for calibration, express the point as ${ctx.agency}'s own view.
- Respond ONLY by calling the 'scorecard' tool.`

  const playbook = loadPlaybook(ctx.outlook)
  const playbookAppendix = playbook
    ? `\n\n---\nADVISORY PLAYBOOK FOR CURRENT OUTLOOK (${ctx.outlook})\nThe advisor recommends these issuer behaviors in this outlook situation. Bias the priority_actions output toward these unless the transcript clearly demonstrates they are already in place. You may add other priority actions, but at least 2 of the 3 should reflect this playbook when applicable.\n\n${playbook.recommended_actions
        .map((a) => `- ${a}`)
        .join('\n')}`
    : ''

  const narrativeAppendix = body.narrative?.trim()
    ? `\n\n---\nISSUER'S PREPARED NARRATIVE MATERIALS (analyze against the reference and advisor notes for credit-relevant themes that are clearly MISSING — these feed the narrative_gap advocacy points):\n\n${body.narrative.trim()}`
    : ''

  const ragAppendix = ragHits.length
    ? `\n\n---\nRETRIEVED ADVISOR NOTES (from the corpus, ranked by relevance — use for narrative gaps and advocacy arguments; treat as confirmed knowledge):\n\n${ragHits
        .map(
          (hit, i) =>
            `### Note ${i + 1} (source: ${hit.category})\n${hit.content}`
        )
        .join('\n\n')}`
    : ''

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools,
      tool_choice: { type: 'tool', name: 'scorecard' },
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Here is the full simulation transcript and per-factor flag history. Produce the scorecard.\n\n${transcript}${narrativeAppendix}${
            knowledgeAppendix
              ? `\n\n---\nPROPRIETARY REFERENCE NOTES BY FACTOR (use to sharpen "flagged" callouts and "recommended_action" specificity):\n\n${knowledgeAppendix}`
              : ''
          }${ragAppendix}${playbookAppendix}`,
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
    const out = toolBlock.input as ScorecardOutput
    // A response cut off at max_tokens loses trailing fields (advocacy_points
    // is last). Surface that as a failure rather than a silently partial
    // scorecard.
    if (
      response.stop_reason === 'max_tokens' ||
      !out.factor_analyses?.length ||
      !out.committee_memo ||
      !out.priority_actions?.length ||
      !out.advocacy_points?.length
    ) {
      console.error(
        `scorecard: incomplete output (stop_reason=${response.stop_reason}, keys=${Object.keys(
          out ?? {}
        ).join(',')})`
      )
      return NextResponse.json(
        { error: 'Scorecard generation came back incomplete. Please try again.' },
        { status: 502 }
      )
    }
    return NextResponse.json(out)
  } catch (err) {
    console.error(
      'scorecard: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'Scorecard generation failed. Please try again.' },
      { status: 502 }
    )
  }
}
