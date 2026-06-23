'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PERSONAS } from '@/lib/personas'
import { factorsFor } from '@/lib/factors'
import { createClient } from '@/lib/supabase/client'
import { getLeadAnalyst } from '@/lib/knowledge/analysts'
import type { Agency } from '@/lib/types'

export type SimulationSession = {
  id: string
  issuer_name: string
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  key_topics: string | null
}

type Flag = 'strong' | 'weak' | 'critical_gap' | 'none'

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

export function Simulation({ session }: { session: SimulationSession }) {
  const [agency, setAgency] = useState<Agency | null>(
    session.agency.length === 1 ? session.agency[0] : null
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

  return <SimulationChat session={session} agency={agency} />
}

function SimulationChat({
  session,
  agency,
}: {
  session: SimulationSession
  agency: Agency
}) {
  const router = useRouter()
  const factors = factorsFor(session.sector)
  const persona = PERSONAS[agency]
  const realAnalyst = getLeadAnalyst(session.sector, agency)
  const analystDisplayName = realAnalyst?.name ?? persona.name
  const analystDisplayRole =
    realAnalyst?.role ?? `Lead ${session.sector} analyst`

  const [narrative, setNarrative] = useState<string | null>(null)
  const [missingNarrative, setMissingNarrative] = useState(false)

  const [factorIdx, setFactorIdx] = useState(0)
  const [results, setResults] = useState<FactorResult[]>(() =>
    factors.map((factor) => ({ factor, flags: [], turns: [] }))
  )
  const [turns, setTurns] = useState<Turn[]>([]) // running chat across all factors
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const seededRef = useRef(false)

  // Load narrative from sessionStorage
  useEffect(() => {
    const n = sessionStorage.getItem(`narrative:${session.id}`)
    if (!n) {
      setMissingNarrative(true)
      return
    }
    setNarrative(n)
  }, [session.id])

  // Autoscroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns, loading])

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
            key_topics: session.key_topics,
          },
          current_factor: factor,
          is_first_turn: isFirstTurn,
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
      session.current_rating,
      session.outlook,
      session.issuer_name,
      session.key_topics,
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
          prev.map((r, i) =>
            i === 0 ? { ...r, turns: [newTurn] } : r
          )
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
    setInput('')
    setError(null)

    const currentFactor = factors[factorIdx]
    const userTurn: Turn = { role: 'user', content: text, factor: currentFactor }
    const nextTurns = [...turns, userTurn]
    setTurns(nextTurns)

    setLoading(true)
    try {
      // History for the model is just the current factor's exchanges
      const factorHistory = nextTurns.filter((t) => t.factor === currentFactor)
      const reply = await callSimulate(currentFactor, factorHistory, false)
      if (!reply) return

      const assistantTurn: Turn = {
        role: 'assistant',
        content: reply.message,
        factor: currentFactor,
      }

      const flagsForFactor =
        reply.previous_answer_flag === 'none' ? [] : [reply.previous_answer_flag]

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
          // Show the final assistant message, then complete
          setTurns([...nextTurns, assistantTurn])
          await finalize([
            ...results.map((r, i) =>
              i === factorIdx
                ? {
                    ...r,
                    flags: [...r.flags, ...flagsForFactor],
                    turns: [...r.turns, userTurn, assistantTurn],
                  }
                : r
            ),
          ])
        } else {
          // Show the closing message, then auto-start the next factor
          setTurns([...nextTurns, assistantTurn])
          setFactorIdx(nextIdx)
          // Kick off next factor's opening question
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

    // Compute summary
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

    // Per-agency results: not persisted (privacy). Held in sessionStorage so
    // /scorecard can render the breakdown.
    sessionStorage.setItem(
      `results:${session.id}:${agency}`,
      JSON.stringify(finalResults)
    )

    // Mark completed agency
    const completedKey = `completed_agencies:${session.id}`
    const existing = JSON.parse(
      sessionStorage.getItem(completedKey) ?? '[]'
    ) as Agency[]
    if (!existing.includes(agency)) {
      sessionStorage.setItem(
        completedKey,
        JSON.stringify([...existing, agency])
      )
    }

    // Persist summary metadata only
    try {
      const supabase = createClient()
      await supabase
        .from('sessions')
        .update({
          overall_score: Number(overall.toFixed(2)),
          factors_flagged: factorsFlagged,
          critical_gaps: criticalGaps,
          status: 'completed',
        })
        .eq('id', session.id)
    } catch {
      // Non-fatal: scorecard will still render from sessionStorage
    }

    router.push(
      `/scorecard?session_id=${session.id}&agency=${encodeURIComponent(agency)}`
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
              <p className="text-sm text-muted">Loading the analyst's first question…</p>
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
                  <Bubble turn={turn} personaName={analystDisplayName} />
                </div>
              )
            })}
            {loading && (
              <p className="text-xs text-muted">{analystDisplayName} is thinking…</p>
            )}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-border px-5 py-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                completed
                  ? 'Session complete.'
                  : 'Type your response as the issuer…'
              }
              disabled={loading || completed}
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
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
            <ul className="mt-3 space-y-2 text-sm">
              {factors.map((f, i) => {
                const status: 'done' | 'in_progress' | 'pending' =
                  completed || i < factorIdx
                    ? 'done'
                    : i === factorIdx
                      ? 'in_progress'
                      : 'pending'
                return (
                  <li key={f} className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <span
                      className={
                        status === 'pending'
                          ? 'text-muted'
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
    </main>
  )
}

function Bubble({
  turn,
  personaName,
}: {
  turn: Turn
  personaName: string
}) {
  const isUser = turn.role === 'user'
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brand text-white'
            : 'border border-border bg-surface text-foreground',
        ].join(' ')}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {personaName}
          </p>
        )}
        <p className="whitespace-pre-wrap">{turn.content}</p>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: 'done' | 'in_progress' | 'pending' }) {
  const cls =
    status === 'done'
      ? 'bg-brand'
      : status === 'in_progress'
        ? 'bg-brand/40 ring-2 ring-brand/20'
        : 'border border-border bg-white'
  return (
    <span
      className={[
        'inline-block h-2.5 w-2.5 rounded-full',
        cls,
      ].join(' ')}
    />
  )
}

function FlagPill({ flag }: { flag: Flag }) {
  if (flag === 'none') return null
  const map: Record<Exclude<Flag, 'none'>, { label: string; cls: string }> = {
    strong: {
      label: 'Strong',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    weak: {
      label: 'Weak',
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
