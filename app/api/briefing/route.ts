import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getKnowledge, filterItemsForSubType } from '@/lib/knowledge'
import type { Agency, BriefingOutput } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'

type Flag = 'strong' | 'adequate' | 'weak' | 'critical_gap' | 'none'

type Turn = { role: 'user' | 'assistant'; content: string; factor: string }

type FactorResult = {
  factor: string
  flags: Flag[]
  turns: Turn[]
}

type BriefingBody = {
  results: FactorResult[]
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
    meeting_date?: string | null
  }
  // Carried through from the generated scorecard so the briefing can build
  // on the advocacy analysis without regenerating it.
  advocacy_points?: Array<{ basis: string; point: string }>
  priority_actions?: string[]
}

const tools: Anthropic.Tool[] = [
  {
    name: 'briefing',
    description:
      'Produce a meeting-ready briefing book: a suggested opening statement and an anticipated Q&A with drafted model answers.',
    input_schema: {
      type: 'object',
      properties: {
        opening_statement: {
          type: 'string',
          description:
            'A suggested 60-90 second meeting opening in first-person management voice ("we"), tailored to the meeting type: for an annual review, lead with what changed year over year and current events; for a new rating request, lead with what the business is and how it makes money. Built ONLY from confirmed narrative facts. Three to five sentences per paragraph, two to three paragraphs, plain prose.',
        },
        qa: {
          type: 'array',
          minItems: 10,
          maxItems: 18,
          description:
            'The anticipated Q&A. Cover EVERY factor with at least one entry. Include the strongest questions the analyst actually asked in the simulation (lightly polished) plus likely follow-ups drawn from the reference notes. Order by factor.',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              question: {
                type: 'string',
                description: 'The anticipated question, in analyst voice.',
              },
              model_answer: {
                type: 'string',
                description:
                  "A drafted model answer in first-person management voice, three to six sentences. Use ONLY facts from the narrative and the issuer's transcript answers — never invent or approximate a figure. Align with the strong-answer markers where provided (e.g., quantify, give the forward view, name the constraint). Where the narrative lacks a needed fact, include a bracketed placeholder like [insert Q3 CET1 figure] rather than a guess.",
              },
              basis: {
                type: 'string',
                enum: ['asked', 'anticipated'],
                description:
                  "'asked' if the analyst asked this (or a close variant) in the simulation; 'anticipated' for likely follow-ups from the reference notes.",
              },
            },
            required: ['factor', 'question', 'model_answer', 'basis'],
          },
        },
      },
      required: ['opening_statement', 'qa'],
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

  const allowed = await checkRateLimit(supabase, user.id, 'briefing')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily briefing limit reached. Your limit resets at midnight UTC.' },
      { status: 429 }
    )
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: BriefingBody
  try {
    body = (await request.json()) as BriefingBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.results?.length || !body?.session_context || !body?.narrative) {
    return NextResponse.json(
      { error: 'Missing results, narrative, or session_context.' },
      { status: 400 }
    )
  }
  if (body.narrative.length > 200_000) {
    return NextResponse.json({ error: 'Narrative too large.' }, { status: 400 })
  }

  const ctx = body.session_context

  const transcript = body.results
    .map((r) => {
      const turnsBlock = r.turns
        .map((t) => `${t.role === 'assistant' ? 'Analyst' : 'Issuer'}: ${t.content}`)
        .join('\n')
      return `=== ${r.factor} ===\n${turnsBlock}`
    })
    .join('\n\n')

  // Markers + likely questions per factor shape the model answers and the
  // anticipated follow-ups.
  const knowledgeAppendix = body.results
    .map((r) => {
      const k = getKnowledge(ctx.agency, ctx.sector, r.factor)
      if (!k) return null
      const markers = filterItemsForSubType(k.strong_answer_markers, ctx.sub_type)
      const questions = filterItemsForSubType(k.real_questions, ctx.sub_type)
      const lines: string[] = []
      if (markers.length > 0) {
        lines.push(`Strong-answer markers:\n${markers.map((m) => `- ${m}`).join('\n')}`)
      }
      if (questions.length > 0) {
        lines.push(`Questions this agency asks:\n${questions.map((q) => `- ${q}`).join('\n')}`)
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

  const systemPrompt = `You are a senior credit ratings advisor preparing a client for a real ${ctx.agency} meeting. The client is ${issuerLine}.${
    ctx.meeting_type ? ` The meeting is a ${ctx.meeting_type}.` : ''
  }

You will produce the client's BRIEFING BOOK: a suggested opening statement and an anticipated Q&A with drafted model answers they can rehearse and adapt.

RULES
- Model answers are in first-person management voice ("we"), specific, and built ONLY from facts in the narrative and the issuer's own transcript answers. Never invent, estimate, or approximate a figure, date, transaction, or event. Where a needed fact is missing, insert a bracketed placeholder (e.g., "[insert LTM charge-off rate]") — placeholders tell the client exactly what to gather.
- Where the simulation exposed a weak answer, the model answer for that question is the corrected version: direct, quantified, aligned with the strong-answer markers.
- Never attribute views to other rating agencies; refer only to ${ctx.agency} or "the agency".
- Cover every factor with at least one Q&A entry. Prefer the questions actually asked in the simulation, then the most likely follow-ups from the reference notes.
- LENGTH DISCIPLINE: keep every field within its stated length. Longer output gets truncated and discarded.
- Respond ONLY by calling the 'briefing' tool.`

  const advocacyBlock = body.advocacy_points?.length
    ? `\n\n---\nADVOCACY POINTS FROM THE SCORECARD (context — do not repeat verbatim, but model answers may carry their substance):\n${body.advocacy_points
        .map((p) => `- ${p.point}`)
        .join('\n')}`
    : ''

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      tools,
      tool_choice: { type: 'tool', name: 'briefing' },
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `ISSUER'S PREPARED NARRATIVE:\n\n${body.narrative}\n\n---\nSIMULATION TRANSCRIPT:\n\n${transcript}${
            knowledgeAppendix
              ? `\n\n---\nREFERENCE NOTES BY FACTOR:\n\n${knowledgeAppendix}`
              : ''
          }${advocacyBlock}\n\n---\nProduce the briefing book.`,
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
    const out = toolBlock.input as Omit<BriefingOutput, 'generated_at'>
    if (
      response.stop_reason === 'max_tokens' ||
      !out.opening_statement ||
      !out.qa?.length
    ) {
      console.error(
        `briefing: incomplete output (stop_reason=${response.stop_reason})`
      )
      return NextResponse.json(
        { error: 'Briefing generation came back incomplete. Please try again.' },
        { status: 502 }
      )
    }
    const briefing: BriefingOutput = {
      ...out,
      generated_at: new Date().toISOString(),
    }
    return NextResponse.json(briefing)
  } catch (err) {
    console.error(
      'briefing: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'Briefing generation failed. Please try again.' },
      { status: 502 }
    )
  }
}
