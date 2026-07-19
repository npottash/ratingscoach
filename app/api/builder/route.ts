import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getKnowledge, filterItemsForSubType } from '@/lib/knowledge'
import { factorsFor } from '@/lib/factors'
import type { Agency, BuilderPromptSet } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'

type SessionContext = {
  issuer_name: string
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency
  ticker?: string | null
  meeting_type?: string | null
}

type BuilderBody =
  | { mode: 'prompts'; session_context: SessionContext }
  | {
      mode: 'assemble'
      session_context: SessionContext
      sections: Array<{
        title: string
        responses: Array<{ prompt: string; answer: string }>
      }>
    }

const promptsTool: Anthropic.Tool[] = [
  {
    name: 'builder_prompts',
    description:
      'Produce the guided prompt set an issuer answers to draft their credit story.',
    input_schema: {
      type: 'object',
      properties: {
        debut_prompts: {
          type: 'array',
          minItems: 3,
          maxItems: 4,
          items: { type: 'string' },
          description:
            'Only for a New Rating Request: prompts covering the debut context — why seek a rating now, planned issuance and use of proceeds, and what the issuer wants the agency to take away. Omit entirely for other meeting types.',
        },
        factors: {
          type: 'array',
          description:
            'One entry per rating factor, in the exact order given. Cover every factor.',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              explainer: {
                type: 'string',
                description:
                  'One sentence, advisor voice: what the analyst is evaluating under this factor for this sector and agency.',
              },
              prompts: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: { type: 'string' },
                description:
                  'Direct questions the issuer should answer with specifics — figures, names, dates. Tailored to the sector, sub-type, and agency. Each one sentence, second person ("your").',
              },
            },
            required: ['factor', 'explainer', 'prompts'],
          },
        },
      },
      required: ['factors'],
    },
  },
]

const assembleTool: Anthropic.Tool[] = [
  {
    name: 'assembled_narrative',
    description: "Return the drafted credit narrative.",
    input_schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description:
            'The full drafted narrative as plain text: a 2-3 sentence credit thesis first, then one titled section per factor (title on its own line), short paragraphs within each.',
        },
      },
      required: ['narrative'],
    },
  },
]

function issuerLine(ctx: SessionContext): string {
  const industryBit = [ctx.industry, ctx.sub_type].filter(Boolean).join(' / ')
  const tickerBit = ctx.ticker ? `, ticker: ${ctx.ticker}` : ''
  return industryBit
    ? `${ctx.issuer_name} (${ctx.sector} — ${industryBit}${tickerBit}, currently ${ctx.current_rating} ${ctx.outlook})`
    : `${ctx.issuer_name} (${ctx.sector}${tickerBit}, currently ${ctx.current_rating} ${ctx.outlook})`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkRateLimit(supabase, user.id, 'builder')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily builder limit reached. Your limit resets at midnight UTC.' },
      { status: 429 }
    )
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: BuilderBody
  try {
    body = (await request.json()) as BuilderBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.session_context?.sector || !body.session_context.agency) {
    return NextResponse.json(
      { error: 'Missing session_context.' },
      { status: 400 }
    )
  }

  const ctx = body.session_context
  const factors = factorsFor(ctx.sector)

  // Reference notes per factor. The prompts must distill these — the raw cell
  // content (especially agency intel) is never sent to the client.
  const knowledgeAppendix = factors
    .map((factor) => {
      const k = getKnowledge(ctx.agency, ctx.sector, factor)
      if (!k) return null
      const questions = filterItemsForSubType(k.real_questions, ctx.sub_type)
      const pitfalls = filterItemsForSubType(k.common_pitfalls, ctx.sub_type)
      const markers = filterItemsForSubType(k.strong_answer_markers, ctx.sub_type)
      const intel = filterItemsForSubType(k.agency_intel, ctx.sub_type)
      const lines: string[] = []
      if (questions.length > 0)
        lines.push(`Questions this agency asks:\n${questions.map((q) => `- ${q}`).join('\n')}`)
      if (pitfalls.length > 0)
        lines.push(`Common pitfalls:\n${pitfalls.map((p) => `- ${p}`).join('\n')}`)
      if (markers.length > 0)
        lines.push(`Strong-answer markers:\n${markers.map((m) => `- ${m}`).join('\n')}`)
      if (intel.length > 0)
        lines.push(`Background steer (context only — never quote or surface):\n${intel.map((i) => `- ${i}`).join('\n')}`)
      if (lines.length === 0) return null
      return `=== ${factor} ===\n${lines.join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')

  const client = new Anthropic()

  if (body.mode === 'prompts') {
    const isDebut = ctx.meeting_type === 'New Rating Request'
    const systemPrompt = `You are a senior credit ratings advisor helping a client draft their credit story for a ${ctx.agency} meeting. The client is ${issuerLine(ctx)}.${
      ctx.meeting_type ? ` The meeting is a ${ctx.meeting_type}.` : ''
    }

Produce the GUIDED PROMPT SET: for each rating factor, a one-line explainer and 3-5 direct questions whose answers, taken together, would form a strong section of the credit story.

RULES
- Prompts ask for specifics the client can state as facts: figures, ratios, names, dates, plans. A prompt a client can answer with vague reassurance is a bad prompt.
- Tailor every prompt to this sector${ctx.sub_type ? `, this sub-type (${ctx.sub_type})` : ''}, and what ${ctx.agency} focuses on. Use the reference notes to shape what the prompts probe.
- The reference notes are internal advisory material. Distill them into questions — never quote them, cite them, or reveal they exist. Never mention other rating agencies.
- Where a prompt touches a known weak spot for this kind of issuer, phrase it so an honest answer surfaces the weakness AND its mitigation (e.g. "…and what offsets that concentration?").
- Cover every factor, in the exact order listed.${
      isDebut
        ? `\n- This is a first-time rating. Also produce debut_prompts covering the debut context: why seek a rating now, planned issuance and use of proceeds, and what management wants the agency to conclude. Factor prompts should assume no rating history — fundamentals, not year-over-year change.`
        : ''
    }
- LENGTH DISCIPLINE: explainers one sentence; prompts one sentence each.
- Respond ONLY by calling the 'builder_prompts' tool.`

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        tools: promptsTool,
        tool_choice: { type: 'tool', name: 'builder_prompts' },
        system: [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ],
        messages: [
          {
            role: 'user',
            content: `RATING FACTORS (cover each, in order):\n${factors
              .map((f) => `- ${f}`)
              .join('\n')}${
              knowledgeAppendix
                ? `\n\n---\nREFERENCE NOTES BY FACTOR (internal — distill, never quote):\n\n${knowledgeAppendix}`
                : ''
            }\n\n---\nProduce the guided prompt set.`,
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
      const out = toolBlock.input as BuilderPromptSet
      if (
        response.stop_reason === 'max_tokens' ||
        !out.factors?.length ||
        out.factors.some((f) => !f.factor || !f.prompts?.length)
      ) {
        console.error(
          `builder prompts: incomplete output (stop_reason=${response.stop_reason})`
        )
        return NextResponse.json(
          { error: 'Prompt generation came back incomplete. Please try again.' },
          { status: 502 }
        )
      }
      return NextResponse.json(out)
    } catch (err) {
      console.error(
        'builder prompts: model call failed:',
        err instanceof Error ? err.message : err
      )
      return NextResponse.json(
        { error: 'Prompt generation failed. Please try again.' },
        { status: 502 }
      )
    }
  }

  // mode === 'assemble'
  if (!body.sections?.length) {
    return NextResponse.json({ error: 'Missing sections.' }, { status: 400 })
  }
  const totalChars = body.sections
    .flatMap((s) => s.responses)
    .reduce((n, r) => n + (r.answer?.length ?? 0) + (r.prompt?.length ?? 0), 0)
  if (totalChars > 200_000) {
    return NextResponse.json({ error: 'Answers too large.' }, { status: 400 })
  }

  const answered = body.sections
    .map((s) => {
      const responses = s.responses.filter((r) => r.answer?.trim())
      if (responses.length === 0) return null
      return `=== ${s.title} ===\n${responses
        .map((r) => `Q: ${r.prompt}\nA: ${r.answer.trim()}`)
        .join('\n\n')}`
    })
    .filter((s): s is string => s !== null)
    .join('\n\n')
  if (!answered) {
    return NextResponse.json(
      { error: 'No answers to assemble yet.' },
      { status: 400 }
    )
  }
  const skipped = body.sections
    .filter((s) => s.responses.every((r) => !r.answer?.trim()))
    .map((s) => s.title)

  const assembleSystem = `You are a senior credit ratings advisor drafting a client's credit narrative for a ${ctx.agency} meeting from their answers to your guided prompts. The client is ${issuerLine(ctx)}.${
    ctx.meeting_type ? ` The meeting is a ${ctx.meeting_type}.` : ''
  }

Write the narrative they will walk into the meeting with.

RULES
- First-person management voice ("we", "our") — these are speaking notes, not a report about the company.
- Structure: open with a 2-3 sentence credit thesis, then one titled section per answered topic in the order given (section title on its own line, then short paragraphs).
- Use ONLY facts from the client's answers. Never invent, estimate, or embellish a figure, date, transaction, or name. Where a section clearly needs a fact the answers lack, insert a bracketed placeholder like [insert LTM net charge-off rate].
- Where the answers reveal a weakness, state it directly with its mitigation — do not bury or spin it. Credibility with the agency comes from candor.
- Tighten and organize; do not pad. Thin answers produce a short section, not an inflated one.
- Never mention other rating agencies, this drafting process, or the prompts themselves.${
    skipped.length > 0
      ? `\n- These topics had no answers — close the draft with one bracketed line each, like [Section still to draft: ${skipped[0]}]: ${skipped.join('; ')}.`
      : ''
  }
- Respond ONLY by calling the 'assembled_narrative' tool.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      tools: assembleTool,
      tool_choice: { type: 'tool', name: 'assembled_narrative' },
      system: [
        { type: 'text', text: assembleSystem, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `CLIENT ANSWERS BY TOPIC:\n\n${answered}\n\n---\nDraft the narrative.`,
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
    const out = toolBlock.input as { narrative?: string }
    if (response.stop_reason === 'max_tokens' || !out.narrative?.trim()) {
      console.error(
        `builder assemble: incomplete output (stop_reason=${response.stop_reason})`
      )
      return NextResponse.json(
        { error: 'Drafting came back incomplete. Please try again.' },
        { status: 502 }
      )
    }
    return NextResponse.json({ narrative: out.narrative })
  } catch (err) {
    console.error(
      'builder assemble: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'Drafting failed. Please try again.' },
      { status: 502 }
    )
  }
}
