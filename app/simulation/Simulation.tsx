'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PERSONAS, type Persona } from '@/lib/personas'
import { factorsFor } from '@/lib/factors'
import { createClient } from '@/lib/supabase/client'
import type { Agency, TransactionContext } from '@/lib/types'

export type SimulationSession = {
  id: string
  issuer_name: string
  ticker: string | null
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  meeting_type: string | null
  transaction_context?: TransactionContext | null
}

type Flag = 'strong' | 'adequate' | 'weak' | 'critical_gap' | 'none'

type Turn = {
  role: 'user' | 'assistant'
  content: string
  factor: string
}

type FactorResult = {
  factor: string
  flags: Flag[]
  turns: Turn[]
}

// Per-agency avatar colors. Distinct from each other and from the brand blue,
// so users can read the agency at a glance.
const AGENCY_AVATAR_CLASSES: Record<Agency, string> = {
  'S&P': 'bg-red-600',
  "Moody's": 'bg-blue-700',
  Fitch: 'bg-orange-500',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export function Simulation({
  session,
  agencyOverride,
  factorsOverride,
}: {
  session: SimulationSession
  agencyOverride?: Agency
  factorsOverride?: string[]
}) {
  const [agency, setAgency] = useState<Agency | null>(
    agencyOverride ?? (session.agency.length === 1 ? session.agency[0] : null)
  )

  if (!agency) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose an agency to simulate
        </h1>
        <p className="mt-2 text-muted">
          Run one agency at a time. You can return to run another after this.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {session.agency.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAgency(a)}
              className="rounded-md border border-border bg-white px-5 py-3 font-medium hover:border-brand hover:text-brand"
            >
              {a}
            </button>
          ))}
        </div>
      </main>
    )
  }

  return (
    <SimulationChat
      session={session}
      agency={agency}
      factorsOverride={factorsOverride}
    />
  )
}

function SimulationChat({
  session,
  agency,
  factorsOverride,
}: {
  session: SimulationSession
  agency: Agency
  factorsOverride?: string[]
}) {
  const router = useRouter()
  // A factor subset supports focused re-drills of weak factors.
  const factors =
    factorsOverride && factorsOverride.length > 0
      ? factorsOverride
      : factorsFor(session.sector)
  const persona = PERSONAS[agency]
  const analystDisplayName = persona.name
  const analystDisplayRole = persona.role

  const [narrative, setNarrative] = useState<string | null>(null)
  const [missingNarrative, setMissingNarrative] = useState(false)

  const [factorIdx, setFactorIdx] = useState(0)
  const [results, setResults] = useState<FactorResult[]>(() =>
    factors.map((factor) => ({ factor, flags: [], turns: [] }))
  )
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  // The session row the scorecard should load. Each completed run gets its
  // own dashboard row; this holds the new row's id once created.
  const [scorecardSessionId, setScorecardSessionId] = useState(session.id)

  const scrollRef = useRef<HTMLDivElement>(null)
  const seededRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Web Speech API for talk-to-text. Works in Chrome / Safari / Edge.
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<unknown>(null)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    ) {
      setSpeechSupported(true)
    }
  }, [])

  function stopRecording() {
    const rec = recognitionRef.current as { stop?: () => void } | null
    rec?.stop?.()
    recognitionRef.current = null
    setRecording(false)
  }

  function toggleRecording() {
    if (recording) {
      stopRecording()
      return
    }
    type SRConstructor = new () => {
      continuous: boolean
      interimResults: boolean
      lang: string
      start: () => void
      stop: () => void
      onresult:
        | ((event: {
            resultIndex: number
            results: Array<{ isFinal: boolean; 0: { transcript: string } }>
          }) => void)
        | null
      onerror: ((event: { error?: string }) => void) | null
      onend: (() => void) | null
    }
    const SR =
      (window as unknown as { SpeechRecognition?: SRConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SRConstructor })
        .webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim()
          if (text) {
            setInput((prev) => (prev ? `${prev} ${text}` : text))
          }
        }
      }
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => {
      setRecording(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  // Load narrative from sessionStorage
  useEffect(() => {
    const n = sessionStorage.getItem(`narrative:${session.id}`)
    if (!n) {
      setMissingNarrative(true)
      return
    }
    setNarrative(n)
  }, [session.id])

  // Auto-scroll chat to the latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns, loading])

  // Refocus the input whenever the API call finishes (so the user can keep
  // typing without re-clicking the field).
  useEffect(() => {
    if (!loading && !completed && !missingNarrative) {
      inputRef.current?.focus()
    }
  }, [loading, completed, missingNarrative])

  // Auto-grow the answer box with its content, up to a cap — issuer answers
  // are typically multi-sentence.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // Warn before browser refresh / tab close / address-bar nav while a
  // simulation is actively in progress. The wordmark link and the step
  // indicator already trigger our own React modals; this covers everything
  // outside Next's client-side router. Modern browsers ignore the custom
  // string and show their own "Leave site?" dialog — the listener just has
  // to be present.
  useEffect(() => {
    const active = turns.length > 0 && !completed && !missingNarrative
    if (!active) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [turns.length, completed, missingNarrative])

  const callSimulate = useCallback(
    async (factor: string, history: Turn[], isFirstTurn: boolean) => {
      if (!narrative) return null
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative,
          history: history.map((t) => ({ role: t.role, content: t.content })),
          session_context: {
            sector: session.sector,
            industry: session.industry,
            sub_type: session.sub_type,
            agency,
            current_rating: session.current_rating,
            outlook: session.outlook,
            issuer_name: session.issuer_name,
            ticker: session.ticker,
            meeting_type: session.meeting_type,
            transaction_context: session.transaction_context,
          },
          current_factor: factor,
          is_first_turn: isFirstTurn,
          is_first_factor: factor === factors[0],
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: '' }))
        throw new Error(msg || `Request failed (${res.status})`)
      }
      return (await res.json()) as {
        message: string
        previous_answer_flag: Flag
        factor_complete: boolean
      }
    },
    [
      narrative,
      session.sector,
      session.industry,
      session.sub_type,
      session.current_rating,
      session.outlook,
      session.issuer_name,
      agency,
    ]
  )

  // Seed the first analyst question once narrative is loaded
  useEffect(() => {
    if (!narrative || seededRef.current || missingNarrative) return
    seededRef.current = true
    ;(async () => {
      try {
        setLoading(true)
        const reply = await callSimulate(factors[0], [], true)
        if (!reply) return
        const newTurn: Turn = {
          role: 'assistant',
          content: reply.message,
          factor: factors[0],
        }
        setTurns([newTurn])
        setResults((prev) =>
          prev.map((r, i) => (i === 0 ? { ...r, turns: [newTurn] } : r))
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start simulation')
      } finally {
        setLoading(false)
      }
    })()
  }, [narrative, missingNarrative, callSimulate, factors])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading || completed) return
    if (recording) stopRecording()
    setInput('')
    setError(null)

    const currentFactor = factors[factorIdx]
    const userTurn: Turn = {
      role: 'user',
      content: text,
      factor: currentFactor,
    }
    const nextTurns = [...turns, userTurn]
    setTurns(nextTurns)

    setLoading(true)
    try {
      const factorHistory = nextTurns.filter((t) => t.factor === currentFactor)
      const reply = await callSimulate(currentFactor, factorHistory, false)
      if (!reply) return

      const assistantTurn: Turn = {
        role: 'assistant',
        content: reply.message,
        factor: currentFactor,
      }

      const flagsForFactor: Flag[] =
        reply.previous_answer_flag === 'none'
          ? []
          : [reply.previous_answer_flag]

      setResults((prev) =>
        prev.map((r, i) =>
          i === factorIdx
            ? {
                ...r,
                flags: [...r.flags, ...flagsForFactor],
                turns: [...r.turns, userTurn, assistantTurn],
              }
            : r
        )
      )

      if (reply.factor_complete) {
        const nextIdx = factorIdx + 1
        if (nextIdx >= factors.length) {
          setTurns([...nextTurns, assistantTurn])
          await finalize(
            results.map((r, i) =>
              i === factorIdx
                ? {
                    ...r,
                    flags: [...r.flags, ...flagsForFactor],
                    turns: [...r.turns, userTurn, assistantTurn],
                  }
                : r
            )
          )
        } else {
          setTurns([...nextTurns, assistantTurn])
          setFactorIdx(nextIdx)
          setLoading(true)
          try {
            const nextReply = await callSimulate(factors[nextIdx], [], true)
            if (!nextReply) return
            const opener: Turn = {
              role: 'assistant',
              content: nextReply.message,
              factor: factors[nextIdx],
            }
            setTurns((prev) => [...prev, opener])
            setResults((prev) =>
              prev.map((r, i) =>
                i === nextIdx ? { ...r, turns: [opener] } : r
              )
            )
          } finally {
            setLoading(false)
          }
        }
      } else {
        setTurns([...nextTurns, assistantTurn])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  async function finalize(finalResults: FactorResult[]) {
    setCompleted(true)

    let totalScore = 0
    let factorsFlagged = 0
    let criticalGaps = 0
    for (const r of finalResults) {
      const weak = r.flags.filter((f) => f === 'weak').length
      const crit = r.flags.filter((f) => f === 'critical_gap').length
      const factorScore = Math.max(0, 10 - 2 * crit - weak)
      totalScore += factorScore
      if (weak + crit > 0) factorsFlagged += 1
      criticalGaps += crit
    }
    const overall =
      finalResults.length > 0 ? totalScore / finalResults.length : 0

    sessionStorage.setItem(
      `results:${session.id}:${agency}`,
      JSON.stringify(finalResults)
    )

    const completedKey = `completed_agencies:${session.id}`
    let existing: Agency[] = []
    try {
      existing = JSON.parse(
        sessionStorage.getItem(completedKey) ?? '[]'
      ) as Agency[]
      if (!Array.isArray(existing)) existing = []
    } catch {
      // Corrupted entry — start fresh rather than crash at the finish line.
      existing = []
    }
    if (!existing.includes(agency)) {
      sessionStorage.setItem(
        completedKey,
        JSON.stringify([...existing, agency])
      )
    }

    // Every completed run gets its OWN dashboard row — a run never overwrites
    // a previous run's score. The intake row acts as setup; the first (and
    // each subsequent) completed run is recorded as a fresh row copied from
    // it, and the setup row is removed once it has no remaining agencies.
    const scoreFields = {
      overall_score: Number(overall.toFixed(2)),
      factors_flagged: factorsFlagged,
      critical_gaps: criticalGaps,
      status: 'completed' as const,
    }

    try {
      const supabase = createClient()

      const { data: master } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session.id)
        .single()
      if (!master) throw new Error('session row not found')

      // Copy the setup row into a new per-run row (drop identity columns and
      // any previous run's scorecard — this run generates its own).
      const {
        id: _id,
        created_at: _createdAt,
        scorecard_output: _prevScorecard,
        ...copy
      } = master as Record<string, unknown> & {
        id: string
        created_at?: string
        scorecard_output?: unknown
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('sessions')
        .insert({ ...copy, agency: [agency], ...scoreFields })
        .select('id')
        .single()
      if (insertErr || !inserted) {
        throw new Error(insertErr?.message ?? 'insert failed')
      }

      // Point the scorecard at the new row and re-key its detailed results.
      // The narrative is re-keyed too, so "Run this session against another
      // agency" from the scorecard finds it under the new row's id.
      setScorecardSessionId(inserted.id)
      sessionStorage.setItem(
        `results:${inserted.id}:${agency}`,
        JSON.stringify(finalResults)
      )
      if (narrative) {
        sessionStorage.setItem(`narrative:${inserted.id}`, narrative)
      }

      // Remove the setup row once every selected agency has been run — but
      // never delete a row that carries a completed run's score.
      const remaining = session.agency.filter(
        (a) => a !== agency && !existing.includes(a)
      )
      if (remaining.length === 0 && master.status !== 'completed') {
        await supabase.from('sessions').delete().eq('id', session.id)
      }
    } catch {
      // Fallback: keep the legacy update-in-place so the score isn't lost
      // entirely if the copy-insert path fails.
      try {
        const supabase = createClient()
        await supabase
          .from('sessions')
          .update(scoreFields)
          .eq('id', session.id)
      } catch {
        // Non-fatal: scorecard still renders from sessionStorage
      }
    }

    // Show the completion modal instead of auto-navigating, so the user can
    // see their final transcript before leaving.
    setShowCompleteModal(true)
  }

  function goToScorecard() {
    router.push(
      `/scorecard?session_id=${scorecardSessionId}&agency=${encodeURIComponent(agency)}`
    )
  }

  if (missingNarrative) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Narrative missing
        </h1>
        <p className="mt-2 text-muted">
          Your narrative is held only in this browser tab and could not be
          found. Please re-enter it to start the simulation.
        </p>
        <button
          onClick={() => router.push(`/narrative?session_id=${session.id}`)}
          className="mt-6 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Back to narrative
        </button>
      </main>
    )
  }

  if (!narrative) {
    return (
      <main className="px-6 py-16 text-center text-sm text-muted">
        Loading…
      </main>
    )
  }

  const currentFactor = factors[factorIdx]

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
      {/* Chat header */}
      <header className="rounded-t-lg border border-border bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AgencyAvatar persona={persona} agency={agency} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {agency} analyst
              </p>
              <h1 className="mt-0.5 text-lg font-semibold">
                {analystDisplayName}{' '}
                <span className="font-normal text-muted">
                  — {analystDisplayRole}
                </span>
              </h1>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">Currently probing</p>
            <p className="font-medium">{currentFactor}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: chat */}
        <section className="flex h-[calc(100vh-260px)] flex-col rounded-b-lg border border-t-0 border-border bg-white lg:rounded-bl-lg lg:rounded-tr-none">
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          >
            {turns.length === 0 && (
              <p className="text-sm text-muted">
                Setting up your meeting with {persona.name} and reviewing your
                narrative…
              </p>
            )}
            {turns.map((turn, i) => {
              const prev = turns[i - 1]
              const showDivider = !prev || prev.factor !== turn.factor
              return (
                <div key={i}>
                  {showDivider && (
                    <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      <span className="h-px flex-1 bg-border" />
                      <span>{turn.factor}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <Bubble
                    turn={turn}
                    persona={persona}
                    agency={agency}
                  />
                </div>
              )
            })}
            {loading && <TypingIndicator persona={persona} agency={agency} />}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 border-t border-border px-5 py-4"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter inserts a new line.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              rows={3}
              placeholder={
                completed
                  ? 'Session complete.'
                  : recording
                    ? 'Listening… speak your response.'
                    : 'Type your response as the issuer… (Shift+Enter for a new line)'
              }
              disabled={loading || completed}
              autoFocus
              className="max-h-[200px] flex-1 resize-none rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading || completed}
                aria-pressed={recording}
                aria-label={recording ? 'Stop dictation' : 'Start dictation'}
                title={recording ? 'Stop dictation' : 'Dictate response'}
                className={[
                  'flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition',
                  recording
                    ? 'animate-pulse border-red-300 bg-red-50 text-red-700'
                    : 'border-border bg-white text-foreground hover:border-brand hover:text-brand',
                  'disabled:opacity-60',
                ].join(' ')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || completed || !input.trim()}
              className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </section>

        {/* RIGHT: progress + flags */}
        <aside className="flex h-[calc(100vh-260px)] flex-col gap-4">
          <section className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Factor progress
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {factors.map((f, i) => {
                const status: 'done' | 'in_progress' | 'pending' =
                  completed || i < factorIdx
                    ? 'done'
                    : i === factorIdx
                      ? 'in_progress'
                      : 'pending'
                return (
                  <li key={f} className="flex items-center gap-2.5">
                    <StatusBadge status={status} />
                    <span
                      className={
                        status === 'pending'
                          ? 'text-muted'
                          : status === 'in_progress'
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground'
                      }
                    >
                      {f}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="flex-1 overflow-y-auto rounded-lg border border-border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Answer flags
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {results.flatMap((r) =>
                r.flags.map((flag, idx) => (
                  <li
                    key={`${r.factor}-${idx}`}
                    className="flex items-start gap-2"
                  >
                    <FlagPill flag={flag} />
                    <span className="text-muted">{r.factor}</span>
                  </li>
                ))
              )}
              {results.every((r) => r.flags.length === 0) && (
                <li className="text-sm text-muted">
                  Flags will appear as you answer.
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      {showCompleteModal && <CompleteModal onView={goToScorecard} />}
    </main>
  )
}

/* ------------------------------------------------------------------------- */
/* Sub-components                                                            */
/* ------------------------------------------------------------------------- */

function AgencyAvatar({
  persona,
  agency,
  size = 'md',
}: {
  persona: Persona
  agency: Agency
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = getInitials(persona.name)
  const sizeClasses =
    size === 'lg'
      ? 'h-11 w-11 text-sm'
      : size === 'sm'
        ? 'h-7 w-7 text-[10px]'
        : 'h-9 w-9 text-xs'
  return (
    <span
      aria-hidden
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide text-white',
        AGENCY_AVATAR_CLASSES[agency],
        sizeClasses,
      ].join(' ')}
      title={`${persona.name} (${agency})`}
    >
      {initials}
    </span>
  )
}

function Bubble({
  turn,
  persona,
  agency,
}: {
  turn: Turn
  persona: Persona
  agency: Agency
}) {
  const isUser = turn.role === 'user'
  return (
    <div
      className={[
        'flex items-start gap-3',
        isUser ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      {!isUser && <AgencyAvatar persona={persona} agency={agency} size="md" />}
      <div
        className={[
          'max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brand text-white'
            : 'border border-border bg-surface text-foreground',
        ].join(' ')}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {persona.name}
          </p>
        )}
        <p className="whitespace-pre-wrap">{turn.content}</p>
      </div>
    </div>
  )
}

function TypingIndicator({
  persona,
  agency,
}: {
  persona: Persona
  agency: Agency
}) {
  return (
    <div className="flex items-start gap-3">
      <AgencyAvatar persona={persona} agency={agency} size="md" />
      <div
        className="inline-flex items-end gap-1 rounded-lg border border-border bg-surface px-4 py-3"
        aria-label={`${persona.name} is typing`}
        role="status"
      >
        <span
          className="block h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="block h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="block h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: 'done' | 'in_progress' | 'pending'
}) {
  if (status === 'done') {
    return (
      <span
        aria-label="Factor complete"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span
        aria-label="Currently probing"
        className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-brand" />
      </span>
    )
  }
  return (
    <span
      aria-label="Pending"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-white"
    >
      <span className="h-2 w-2 rounded-full bg-border" />
    </span>
  )
}

function FlagPill({ flag }: { flag: Flag }) {
  if (flag === 'none') return null
  const map: Record<Exclude<Flag, 'none'>, { label: string; cls: string }> = {
    strong: {
      label: 'Strong',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    adequate: {
      label: 'Adequate',
      cls: 'bg-slate-50 text-slate-600 border-slate-200',
    },
    weak: {
      label: 'Needs sharpening',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    critical_gap: {
      label: 'Critical gap',
      cls: 'bg-red-50 text-red-700 border-red-200',
    },
  }
  const { label, cls } = map[flag]
  return (
    <span
      className={[
        'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
        cls,
      ].join(' ')}
    >
      {label}
    </span>
  )
}

function CompleteModal({ onView }: { onView: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Done
        </p>
        <h2
          id="complete-modal-title"
          className="mt-2 text-xl font-semibold tracking-tight text-foreground"
        >
          Session complete — view your scorecard
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Nice work. Your scorecard is ready, including the factor-by-factor
          breakdown, the draft committee memo, and your priority prep
          actions.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onView}
            autoFocus
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            View your scorecard
          </button>
        </div>
      </div>
    </div>
  )
}
