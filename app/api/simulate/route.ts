import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PERSONAS } from '@/lib/personas'
import { questionsFor } from '@/lib/questions'
import {
  getKnowledge,
  filterItemsForSubType,
  loadPlaybook,
  type KnowledgeCell,
} from '@/lib/knowledge'
import type { Agency } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

type SessionContext = {
  sector: string
  industry: string | null
  sub_type: string | null
  agency: Agency
  current_rating: string
  outlook: string
  issuer_name: string
  key_topics: string | null
}

type SimulateBody = {
  narrative: string
  history: ChatTurn[]
  session_context: SessionContext
  current_factor: string
  is_first_turn: boolean
}

type ToolResponse = {
  message: string
  previous_answer_flag: 'strong' | 'weak' | 'critical_gap' | 'none'
  factor_complete: boolean
}

const tools: Anthropic.Tool[] = [
  {
    name: 'respond',
    description:
      "Provide your next question or follow-up as the analyst, plus a quality flag for the user's most recent answer.",
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description:
            'Your next question or probing follow-up. One to three sentences. Stay in character as the analyst.',
        },
        previous_answer_flag: {
          type: 'string',
          enum: ['strong', 'weak', 'critical_gap', 'none'],
          description:
            "Quality assessment of the user's most recent answer. 'strong' = clear, evidence-backed, addresses the question. 'weak' = vague, evasive, or missing key detail. 'critical_gap' = exposes a material credit concern or shows the issuer is unprepared. 'none' = use only on the very first turn when there is no prior answer.",
        },
        factor_complete: {
          type: 'boolean',
          description:
            'True if you have sufficiently probed this factor (typically after 2-3 exchanges) and the simulation should advance to the next factor.',
        },
      },
      required: ['message', 'previous_answer_flag', 'factor_complete'],
    },
  },
]

function renderKnowledgeBlock(
  knowledge: KnowledgeCell | null,
  fallbackBank: string[],
  agency: Agency,
  subType: string | null
): string {
  const sections: string[] = []

  const realQs = knowledge
    ? filterItemsForSubType(knowledge.real_questions, subType)
    : []
  const pitfalls = knowledge
    ? filterItemsForSubType(knowledge.common_pitfalls, subType)
    : []
  const markers = knowledge
    ? filterItemsForSubType(knowledge.strong_answer_markers, subType)
    : []
  const intel = knowledge
    ? filterItemsForSubType(knowledge.agency_intel, subType)
    : []

  if (realQs.length > 0) {
    sections.push(
      `Real questions ${agency} analysts have asked on this factor (adapt; do not read verbatim):\n${realQs
        .map((q) => `- ${q}`)
        .join('\n')}`
    )
  } else if (fallbackBank.length > 0) {
    sections.push(
      `Reference questions for this factor (adapt; do not read verbatim):\n${fallbackBank
        .map((q) => `- ${q}`)
        .join('\n')}`
    )
  }

  if (pitfalls.length > 0) {
    sections.push(
      `Common pitfalls — patterns where issuers consistently stumble on this factor. Probe for these specifically:\n${pitfalls
        .map((p) => `- ${p}`)
        .join('\n')}`
    )
  }

  if (markers.length > 0) {
    sections.push(
      `Markers of a strong answer on this factor — reserve a "strong" flag only when these markers are present:\n${markers
        .map((m) => `- ${m}`)
        .join('\n')}`
    )
  }

  if (intel.length > 0) {
    sections.push(
      `${agency} intel — non-public observations on what they actually weigh heavily. Use to angle your questions:\n${intel
        .map((i) => `- ${i}`)
        .join('\n')}`
    )
  }

  if (sections.length === 0) return ''
  return `ANALYST KNOWLEDGE (PROPRIETARY — use to sharpen your probing)\n\n${sections.join('\n\n')}`
}

function buildSystemPrompt(args: {
  narrative: string
  ctx: SessionContext
  factor: string
  pastRealQuestions: string[]
}): string {
  const persona = PERSONAS[args.ctx.agency]
  const knowledge = getKnowledge(args.ctx.agency, args.ctx.sector, args.factor)
  const fallbackBank = questionsFor(args.ctx.sector, args.factor)

  const knowledgeBlock = renderKnowledgeBlock(
    knowledge,
    fallbackBank,
    args.ctx.agency,
    args.ctx.sub_type
  )

  const playbook = loadPlaybook(args.ctx.outlook)
  const playbookBlock = playbook
    ? `ADVISORY PLAYBOOK FOR CURRENT OUTLOOK
The issuer is on ${args.ctx.outlook}. The advisor recommends these issuer behaviors in this situation. Use them to inform your probing — if the issuer's narrative or responses reveal they are NOT doing these things, that is a meaningful concern worth surfacing.

${playbook.recommended_actions.map((a) => `- ${a}`).join('\n')}`
    : ''

  const historyBlock =
    args.pastRealQuestions.length > 0
      ? `ISSUER HISTORY WITH ${args.ctx.agency}
This issuer has been asked these questions by ${args.ctx.agency} analysts in past REAL meetings. Calibrate your probing direction and emphasis — themes that recur here are elevated priorities. Do not literally repeat these questions; treat them as topical signal.

${args.pastRealQuestions.map((q) => `- ${q}`).join('\n')}`
      : ''

  return `You are ${persona.name}, ${persona.role} at ${args.ctx.agency}. You are conducting a rating agency meeting with the issuer described below. You are a fictional analyst persona created for issuer prep — never claim to be a real person.

PERSONA AND STYLE
${persona.style}

ISSUER UNDER REVIEW
- Name: ${args.ctx.issuer_name}
- Sector: ${args.ctx.sector}
${args.ctx.industry ? `- Industry: ${args.ctx.industry}` : ''}
${args.ctx.sub_type ? `- Sub-type: ${args.ctx.sub_type}` : ''}
- Current rating: ${args.ctx.current_rating}
- Outlook: ${args.ctx.outlook}
${args.ctx.key_topics ? `- Topics the issuer flagged: ${args.ctx.key_topics}` : ''}

${historyBlock}

CURRENT FACTOR
You are currently probing: ${args.factor}.
Stay on this factor. Drill in. Do not pivot to other factors — the simulation will advance you when ready.

ISSUER'S PREPARED NARRATIVE (private to you)
The issuer prepared the following narrative. Use it to identify weaknesses, gaps, and inconsistencies. Probe what they have NOT addressed.
---
${args.narrative}
---

${knowledgeBlock}

${playbookBlock}

RULES
- Ask ONE short question per turn. Single sentence. No compound questions. No "and also tell me about X" tag-ons.
- Probe the credit STORY — the durability of the narrative, the strategic rationale, management thinking, how the issuer reasons under pressure. Do not turn this into a metric drill.
- Only ask for a specific number when the narrative itself cited one and you are stress-testing the interpretation. Do not quiz on memorized ratios.
- Tone: professional, courteous, and curious. You are sharp underneath but respectful on the surface. You are a colleague exploring the credit, not an interrogator. Acknowledge a good point briefly before moving on. Never sarcastic, never blunt-to-the-point-of-rude.
- Stay conversational. You are in a real meeting, not an oral exam.
- Probe weaknesses and missing detail through curious questions, not confrontation. Do not coach, summarize, or feed answers.
- After 2-3 exchanges on this factor, set factor_complete=true. When you set factor_complete=true, your message must be a brief one or two sentence CLOSING acknowledgment of the topic — NOT a new question. Example: "Thanks, that gives me a clear picture of how you're thinking about funding." The simulation will introduce the next topic in the next turn.
- Flag the issuer's previous answer honestly. "weak" = vague, evasive, or shallow. "critical_gap" = the answer exposed a material credit concern or showed the issuer is unprepared. "strong" = a clear, specific, well-reasoned answer that strengthens the story. Use "none" only on the very first turn.
- Respond ONLY by calling the 'respond' tool.`
}

export async function POST(request: Request) {
  // Auth gate: only signed-in users can hit the simulator
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

  let body: SimulateBody
  try {
    body = (await request.json()) as SimulateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.narrative || !body?.session_context || !body?.current_factor) {
    return NextResponse.json(
      { error: 'Missing narrative, session_context, or current_factor.' },
      { status: 400 }
    )
  }

  // Pull the most recent real questions this issuer has been asked by this
  // agency in this sector. Used to calibrate the analyst's probing direction.
  const { data: pastQRows } = await supabase
    .from('real_questions')
    .select('question_text')
    .eq('user_id', user.id)
    .eq('agency', body.session_context.agency)
    .eq('sector', body.session_context.sector)
    .order('created_at', { ascending: false })
    .limit(30)
  const pastRealQuestions = (pastQRows ?? []).map((r) => r.question_text)

  const client = new Anthropic()

  const systemPrompt = buildSystemPrompt({
    narrative: body.narrative,
    ctx: body.session_context,
    factor: body.current_factor,
    pastRealQuestions,
  })

  // For the very first turn there's no prior user message. We seed a user turn
  // that prompts the analyst to begin probing the current factor.
  const messages: Anthropic.MessageParam[] = body.is_first_turn
    ? [
        {
          role: 'user',
          content: `Begin probing ${body.current_factor}. Open with a brief transition sentence acknowledging you're moving to this topic (e.g., "Let's turn to ${body.current_factor}." or "Moving on to ${body.current_factor}."), then ask your first question.`,
        },
      ]
    : body.history.map((t) => ({ role: t.role, content: t.content }))

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      tool_choice: { type: 'tool', name: 'respond' },
      // Cache the system prompt — it's stable across turns within a single
      // factor and the narrative is the bulk of the tokens.
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return a structured response.' },
        { status: 502 }
      )
    }

    const result = toolBlock.input as ToolResponse
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Anthropic call failed: ${msg}` },
      { status: 502 }
    )
  }
}
