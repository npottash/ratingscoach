import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PERSONAS } from '@/lib/personas'
import { getKnowledge } from '@/lib/knowledge'
import { getLeadAnalyst } from '@/lib/knowledge/analysts'
import type { Agency } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'

type Flag = 'strong' | 'weak' | 'critical_gap' | 'none'

type Turn = { role: 'user' | 'assistant'; content: string; factor: string }

type FactorResult = {
  factor: string
  flags: Flag[]
  turns: Turn[]
}

type ScorecardBody = {
  results: FactorResult[]
  session_context: {
    issuer_name: string
    sector: string
    industry: string | null
    sub_type: string | null
    current_rating: string
    outlook: string
    agency: Agency
  }
}

type ScorecardOutput = {
  factor_analyses: Array<{
    factor: string
    handled_well: string
    flagged: string
    recommended_action: string
  }>
  committee_memo: string
  priority_actions: string[]
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
      },
      required: ['factor_analyses', 'committee_memo', 'priority_actions'],
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

  const persona = PERSONAS[body.session_context.agency]
  const ctx = body.session_context
  const realAnalyst = getLeadAnalyst(ctx.sector, ctx.agency)
  const analystName = realAnalyst?.name ?? persona.name
  const analystRole = realAnalyst?.role ?? `Lead ${ctx.sector} analyst`

  const transcript = body.results
    .map((r) => {
      const flagsLine = r.flags.length
        ? `Flags: ${r.flags.join(', ')}`
        : 'Flags: none'
      const turnsBlock = r.turns
        .map(
          (t) =>
            `${t.role === 'assistant' ? `${analystName} (analyst)` : 'Issuer'}: ${t.content}`
        )
        .join('\n')
      return `=== ${r.factor} ===\n${flagsLine}\n${turnsBlock}`
    })
    .join('\n\n')

  const knowledgeAppendix = body.results
    .map((r) => {
      const k = getKnowledge(ctx.agency, ctx.sector, r.factor)
      if (!k) return null
      const lines: string[] = []
      if (k.common_pitfalls.length > 0) {
        lines.push(
          `Common pitfalls on this factor:\n${k.common_pitfalls.map((p) => `- ${p}`).join('\n')}`
        )
      }
      if (k.strong_answer_markers.length > 0) {
        lines.push(
          `Markers of a strong answer on this factor:\n${k.strong_answer_markers.map((m) => `- ${m}`).join('\n')}`
        )
      }
      if (k.agency_intel.length > 0) {
        lines.push(
          `${ctx.agency} intel for this factor:\n${k.agency_intel.map((i) => `- ${i}`).join('\n')}`
        )
      }
      if (lines.length === 0) return null
      return `=== ${r.factor} ===\n${lines.join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')

  const industryLine = [ctx.industry, ctx.sub_type].filter(Boolean).join(' / ')
  const issuerLine = industryLine
    ? `${ctx.issuer_name} (${ctx.sector} — ${industryLine}, currently ${ctx.current_rating} ${ctx.outlook})`
    : `${ctx.issuer_name} (${ctx.sector}, currently ${ctx.current_rating} ${ctx.outlook})`

  const systemPrompt = `You are ${analystName}, ${analystRole} at ${ctx.agency}. You just finished a rating prep simulation with ${issuerLine}.

You will now produce a structured scorecard that the issuer's CFO / IR team will read to prepare for the real meeting.

GUIDELINES
- Be specific. Cite what was actually said. No platitudes.
- "Handled well" must point to a concrete moment of strength. If nothing was strong on a factor, say so honestly.
- "Flagged" must call out the most material weakness — vague answer, missing detail, exposed risk.
- "Recommended action" is one concrete prep action — not "study more", but e.g. "have a sourced CET1 trajectory chart through Q4 2027 ready, with a binding-constraint label at each quarter".
- Committee memo: write as you would for an internal rating committee. Four to six sentences, plain prose, land on a directional take (e.g. "supports current rating", "outlook deterioration risk", "rating-action candidate if X").
- Priority actions: exactly three, ordered. Concrete. The most important first.
- Stay in ${ctx.agency} voice and methodology.
- Respond ONLY by calling the 'scorecard' tool.`

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
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
          content: `Here is the full simulation transcript and per-factor flag history. Produce the scorecard.\n\n${transcript}${
            knowledgeAppendix
              ? `\n\n---\nPROPRIETARY REFERENCE NOTES BY FACTOR (use to sharpen "flagged" callouts and "recommended_action" specificity):\n\n${knowledgeAppendix}`
              : ''
          }`,
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
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Anthropic call failed: ${msg}` },
      { status: 502 }
    )
  }
}
