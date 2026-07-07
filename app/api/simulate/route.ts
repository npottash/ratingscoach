import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
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
// Server-enforced pacing: steer the analyst to wrap up a factor once the
// issuer has given this many answers, and force-complete it at the hard cap
// so a session can never stall inside one factor.
const FACTOR_ANSWER_TARGET = 3
const FACTOR_ANSWER_MAX = 5

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
  ticker?: string | null
  meeting_type?: string | null
}

type SimulateBody = {
  narrative: string
  history: ChatTurn[]
  session_context: SessionContext
  current_factor: string
  is_first_turn: boolean
  is_first_factor?: boolean
}

type ToolResponse = {
  message: string
  previous_answer_flag: 'strong' | 'adequate' | 'weak' | 'critical_gap' | 'none'
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
          enum: ['strong', 'adequate', 'weak', 'critical_gap', 'none'],
          description:
            "Quality assessment of the user's most recent answer. 'strong' = specific, evidence-backed, and well-reasoned — it strengthens the credit story. 'adequate' = answers the question with reasonable substance; the normal grade for a prepared issuer. 'weak' = genuinely vague, evasive, or unsupported. 'critical_gap' = exposes a material credit concern or shows the issuer is unprepared. 'none' = use only on the very first turn when there is no prior answer.",
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
  return `ANALYST KNOWLEDGE (PROPRIETARY — use to sharpen your probing)
Some notes below cite other rating agencies' views for calibration. That is background for YOU only — in the meeting, express any such point as ${agency}'s own house view and never attribute it to another agency.

${sections.join('\n\n')}`
}

/**
 * Meeting-type focus block. An annual review is an update meeting — the
 * analyst knows the business and probes what changed plus current events.
 * A new rating request is a first-time meeting — the analyst is building
 * an understanding of the business and its inherent credit risks from
 * scratch. Old sessions without a meeting_type get no block (update-style
 * default behavior).
 */
function meetingFocusBlock(meetingType: string | null | undefined): string {
  switch (meetingType) {
    case 'Annual Review':
      return `MEETING TYPE: ANNUAL REVIEW (update meeting)
You have covered this issuer before. Focus on what has CHANGED: year-over-year movement in the credit story, progress on concerns flagged in prior reviews, and current events and the latest agency pressure points as they hit this issuer. Assume familiarity with the basics of the business — do not re-litigate what the company is or how it makes money.`
    case 'New Rating Request':
      return `MEETING TYPE: NEW RATING REQUEST (first-time issuer meeting)
This issuer has no rating history with you. Focus on UNDERSTANDING: how the business model works and makes money, the credit risks inherent to this type of company, and your agency's focus areas for the sector. You are establishing the baseline — there is no prior year to compare against, so avoid update-style "what changed" questions and dig into fundamentals, structure, competitive position, and management quality instead.`
    case 'Transaction Update':
      return `MEETING TYPE: TRANSACTION UPDATE
This meeting exists because of a specific transaction or event. Prioritize the transaction: its rationale, financing and structure, and its credit impact — then material changes in the broader credit story since the last review, including relevant current events.`
    default:
      return ''
  }
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

Today's date: ${new Date().toISOString().slice(0, 10)}.

ISSUER UNDER REVIEW
- Name: ${args.ctx.issuer_name}${args.ctx.ticker ? ` (ticker: ${args.ctx.ticker} — use what you know of this public issuer to sharpen your probing, but never invent specifics you are unsure of)` : ''}
- Sector: ${args.ctx.sector}
${args.ctx.industry ? `- Industry: ${args.ctx.industry}` : ''}
${args.ctx.sub_type ? `- Sub-type: ${args.ctx.sub_type}` : ''}
- Current rating: ${args.ctx.current_rating}
- Outlook: ${args.ctx.outlook}

${meetingFocusBlock(args.ctx.meeting_type)}

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
- When the MEETING TYPE calls for update focus (annual review, transaction update, or unspecified), regularly tie your probing to current events and the latest agency pressure points: how recent geopolitical, macro, or sector developments (drawn from the ANALYST KNOWLEDGE block, the issuer history, and developments you know of as of today's date) are impacting the issuer's portfolio and business, and what management is doing about the resulting risks. The pattern: "How is [recent event] impacting [credit risk in your portfolio / your business / your fundraising], and how are you addressing it?" At least one question per factor should have this current-events character when the knowledge block or recent developments give you material for it.
- Only ask for a specific number when the narrative itself cited one and you are stress-testing the interpretation. Do not quiz on memorized ratios.
- You are ${args.ctx.agency} and ONLY ${args.ctx.agency}. Never reference another rating agency or its views in the meeting — real analysts do not cite competitors. If your knowledge notes attribute a view to another agency, either express it as your own house view or leave it out.
- FACTUAL DISCIPLINE: only commit to a specific factual point when you have a high level of certainty in it. This applies to issuer-specific facts, recent events, and statistics alike. When you are less than certain, probe instead of asserting ("How exposed are you to X?" — not "Your exposure to X is Y"), attribute what you cite ("your narrative cites...", "we've seen across the sector..."), or keep the point sector-general. Never invent or approximate a figure, a date, a transaction, or an event — one fabricated specific costs you more credibility than ten softer questions.
- Tone: professional, courteous, and curious. You are sharp underneath but respectful on the surface. You are a colleague exploring the credit, not an interrogator. Acknowledge a good point briefly before moving on. Never sarcastic, never blunt-to-the-point-of-rude.
- Stay conversational. You are in a real meeting, not an oral exam.
- Probe weaknesses and missing detail through curious questions, not confrontation. Do not coach, summarize, or feed answers.
- After 2-3 exchanges on this factor, set factor_complete=true. When you set factor_complete=true, your message must be a brief one or two sentence CLOSING acknowledgment of the topic — NOT a new question. Example: "Thanks, that gives me a clear picture of how you're thinking about funding." The simulation will introduce the next topic in the next turn.
- Flag the issuer's previous answer honestly, on a four-point scale. "strong" = specific, evidence-backed, well-reasoned — it strengthens the story. "adequate" = answers the question with reasonable substance; this is the NORMAL grade for a prepared issuer. "weak" = genuinely vague, evasive, or unsupported. "critical_gap" = exposed a material credit concern or real unpreparedness. For a well-prepared issuer most answers should land adequate or strong — weak is the exception, not the default. Use "none" only on the very first turn.
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

  const allowed = await checkRateLimit(supabase, user.id, 'simulate')
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Daily simulation limit reached. Your limit resets at midnight UTC.',
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

  // Bound the cost of a single turn. ~200k chars ≈ 50k tokens of narrative.
  if (body.narrative.length > 200_000) {
    return NextResponse.json(
      {
        error:
          'Narrative is too long. Trim it to the material that matters for the meeting (under ~200,000 characters).',
      },
      { status: 413 }
    )
  }

  // A non-first turn with no history would produce an empty messages array,
  // which the Anthropic API rejects. Return a clean error instead.
  if (!body.is_first_turn && (!body.history || body.history.length === 0)) {
    return NextResponse.json(
      { error: 'History is required after the first turn.' },
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
          content: body.is_first_factor
            ? `This is the opening of the meeting. Greet the issuer briefly and warmly — thank them for meeting with you and for providing their credit story (e.g., "Thank you for meeting with us today and for sharing your credit story — let's dive into a few areas we'd like to learn more about."), then ask your first question on ${body.current_factor}.`
            : `Begin probing ${body.current_factor}. Open with a brief transition sentence acknowledging you're moving to this topic (e.g., "Let's turn to ${body.current_factor}." or "Moving on to ${body.current_factor}."), then ask your first question.`,
        },
      ]
    : body.history.map((t) => ({ role: t.role, content: t.content }))

  // The prompt alone doesn't reliably end a factor — a skeptical analyst
  // always has one more question. Count the issuer's answers and steer the
  // model to close once the target is reached.
  const answerCount = body.is_first_turn
    ? 0
    : body.history.filter((t) => t.role === 'user').length

  // Cache the main system prompt — it's stable across turns within a single
  // factor and the narrative is the bulk of the tokens. The pacing directive
  // goes in a separate block so it doesn't bust the cache.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ]
  if (answerCount >= FACTOR_ANSWER_TARGET) {
    system.push({
      type: 'text',
      text: `The issuer has now given ${answerCount} answers on this factor. You MUST set factor_complete=true this turn: flag the previous answer as usual and give a brief one or two sentence closing acknowledgment — NOT a new question.`,
    })
  } else if (
    answerCount === FACTOR_ANSWER_TARGET - 1 &&
    body.session_context.meeting_type !== 'New Rating Request'
  ) {
    // Left to itself the analyst follows the narrative thread and never gets
    // to the update-meeting material — steer the factor's last question
    // toward current events when the knowledge block offers any. First-time
    // issuer meetings skip this: their focus is understanding the business,
    // not the update agenda.
    system.push({
      type: 'text',
      text: "Your next question MUST be a current-events question. That means a specific, NAMED external event or development — a geopolitical conflict, a sector shock, a policy or regulatory change — taken from your ANALYST KNOWLEDGE for this factor (items phrased around a named event) or from developments you know of. Ask how that event is impacting this issuer and how management is addressing the resulting risk, adapted to their book. Questions about the issuer's own narrative topics (their portfolio cycles, their reserves, their targets) do NOT count — the subject must be the external event. Park your current thread; you can note it in your closing. Ask it naturally — do not announce it as a current-events question. Prefer events named in your ANALYST KNOWLEDGE; only reach for an event from your own knowledge if you are highly certain it is real and current. Skip ONLY if neither source offers any named external event relevant to this factor.",
    })
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      tool_choice: { type: 'tool', name: 'respond' },
      system,
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
    // Hard backstop: never let a factor run past the cap even if the model
    // ignores the pacing directive.
    if (answerCount >= FACTOR_ANSWER_MAX) {
      result.factor_complete = true
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error(
      'simulate: model call failed:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: 'The analyst is briefly unavailable. Please try again.' },
      { status: 502 }
    )
  }
}
