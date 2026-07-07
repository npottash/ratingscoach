'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PERSONAS } from '@/lib/personas'
import { createClient } from '@/lib/supabase/client'
import { saveRealQuestions } from './actions'
import type { Agency } from '@/lib/types'

export type ScorecardSession = {
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
  meeting_date: string | null
  overall_score: number | null
  factors_flagged: number
  critical_gaps: number
  // Persisted scorecard for completed runs. Optional: rows created before
  // the migration (or before this feature) won't have it.
  scorecard_output?: ScorecardOutput | null
}

type Flag = 'strong' | 'adequate' | 'weak' | 'critical_gap' | 'none'

type Turn = { role: 'user' | 'assistant'; content: string; factor: string }

type FactorResult = {
  factor: string
  flags: Flag[]
  turns: Turn[]
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
  // Optional: cached outputs generated before this field existed lack it.
  advocacy_points?: Array<{
    basis: AdvocacyBasis
    point: string
  }>
}

const ADVOCACY_BASIS_LABELS: Record<AdvocacyBasis, string> = {
  narrative_gap: 'Narrative gap',
  peer_benchmarking: 'Peer benchmarking',
  performance_trajectory: 'Trajectory',
  methodology: 'Methodology',
}

export function Scorecard({
  session,
  agency,
  autoPrint = false,
}: {
  session: ScorecardSession
  agency: Agency
  autoPrint?: boolean
}) {
  const persona = PERSONAS[agency]

  type CoachMessage = { role: 'user' | 'assistant'; content: string }
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([])
  const [coachInput, setCoachInput] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachError, setCoachError] = useState<string | null>(null)
  const coachScrollRef = useRef<HTMLDivElement>(null)

  const [results, setResults] = useState<FactorResult[] | null>(null)
  const [output, setOutput] = useState<ScorecardOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [remainingAgencies, setRemainingAgencies] = useState<Agency[]>([])

  // Autoscroll the coach chat as new messages arrive
  useEffect(() => {
    coachScrollRef.current?.scrollTo({
      top: coachScrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [coachMessages, coachLoading])

  async function handleAskCoach(e: React.FormEvent) {
    e.preventDefault()
    const question = coachInput.trim()
    if (!question || coachLoading) return
    setCoachInput('')
    setCoachError(null)

    const nextMessages: CoachMessage[] = [
      ...coachMessages,
      { role: 'user', content: question },
    ]
    setCoachMessages(nextMessages)
    setCoachLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: coachMessages,
          session_context: {
            issuer_name: session.issuer_name,
            sector: session.sector,
            industry: session.industry,
            sub_type: session.sub_type,
            current_rating: session.current_rating,
            outlook: session.outlook,
            agency,
            ticker: session.ticker,
            meeting_type: session.meeting_type,
            meeting_date: session.meeting_date,
          },
          session_results: results ?? [],
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: '' }))
        throw new Error(msg || `Request failed (${res.status})`)
      }
      const { answer } = (await res.json()) as { answer: string }
      setCoachMessages([...nextMessages, { role: 'assistant', content: answer }])
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Coach call failed')
    } finally {
      setCoachLoading(false)
    }
  }

  useEffect(() => {
    const completed = readJson<Agency[]>(
      `completed_agencies:${session.id}`,
      []
    )
    setRemainingAgencies(session.agency.filter((a) => !completed.includes(a)))
  }, [session.id, session.agency])

  useEffect(() => {
    // Persist the generated scorecard (derived work product only — never the
    // narrative or transcript) so the dashboard can re-render and export it
    // later. Best-effort: failure just means no archived copy.
    const persist = async (out: ScorecardOutput) => {
      try {
        const supabase = createClient()
        await supabase
          .from('sessions')
          .update({ scorecard_output: out })
          .eq('id', session.id)
      } catch {
        // Non-fatal (e.g. column not migrated yet, or offline).
      }
    }

    const parsed = readJson<FactorResult[] | null>(
      `results:${session.id}:${agency}`,
      null
    )
    if (!parsed) {
      // No live transcript in this tab — fall back to the archived scorecard
      // if one was saved for this run.
      if (session.scorecard_output) {
        setOutput(session.scorecard_output)
      } else {
        setMissing(true)
      }
      return
    }
    setResults(parsed)

    // Reuse a previously generated scorecard for this session+agency so a
    // refresh or back-navigation doesn't burn another Claude call.
    const cacheKey = `scorecard_output:${session.id}:${agency}`
    const cached = readJson<ScorecardOutput | null>(cacheKey, null)
    if (cached) {
      setOutput(cached)
      if (!session.scorecard_output) void persist(cached)
      return
    }

    ;(async () => {
      try {
        const res = await fetch('/api/scorecard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: parsed,
            narrative:
              sessionStorage.getItem(`narrative:${session.id}`) ?? undefined,
            session_context: {
              issuer_name: session.issuer_name,
              sector: session.sector,
              industry: session.industry,
              sub_type: session.sub_type,
              current_rating: session.current_rating,
              outlook: session.outlook,
              agency,
              ticker: session.ticker,
              meeting_type: session.meeting_type,
              meeting_date: session.meeting_date,
            },
          }),
        })
        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({ error: '' }))
          throw new Error(msg || `Request failed (${res.status})`)
        }
        const out = (await res.json()) as ScorecardOutput
        setOutput(out)
        void persist(out)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(out))
        } catch {
          // Storage full/unavailable — non-fatal, just no caching.
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate scorecard')
      }
    })()
  }, [
    session.id,
    session.issuer_name,
    session.sector,
    session.current_rating,
    session.outlook,
    session.scorecard_output,
    agency,
  ])

  // Dashboard "PDF" link lands here with ?print=1 — open the print dialog
  // once the scorecard content is on screen.
  const printedRef = useRef(false)
  useEffect(() => {
    if (!autoPrint || !output || printedRef.current) return
    printedRef.current = true
    const t = setTimeout(() => window.print(), 500)
    return () => clearTimeout(t)
  }, [autoPrint, output])

  const totalWeakFlags = results
    ? results.reduce(
        (sum, r) => sum + r.flags.filter((f) => f === 'weak').length,
        0
      )
    : 0
  const totalCriticalFlags = results
    ? results.reduce(
        (sum, r) => sum + r.flags.filter((f) => f === 'critical_gap').length,
        0
      )
    : session.critical_gaps

  if (missing) {
    const hasSummary = session.overall_score != null
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {hasSummary
              ? 'Your saved results for this session'
              : 'Detailed scorecard not available here'}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            {hasSummary ? (
              <>
                This run predates saved scorecards, so its full detail lived
                only in the browser tab where the simulation ran. The summary
                below is what we keep. Newly completed sessions save their
                scorecard automatically for later viewing and PDF export —
                re-run the simulation to generate one.
              </>
            ) : (
              <>
                The detailed results are held only in the browser tab where you
                ran the simulation and were not found here. Re-run the
                simulation to regenerate them.
              </>
            )}
          </p>
        </div>

        {hasSummary && (
          <div className="mt-8 rounded-lg border border-border bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {agency} readiness · {session.issuer_name}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-6">
              <Stat
                label="Readiness"
                value={`${session.overall_score!.toFixed(1)}/10`}
                accent
              />
              <Stat
                label="Flagged factors"
                value={String(session.factors_flagged)}
              />
              <Stat
                label="Critical gaps"
                value={String(session.critical_gaps)}
              />
            </div>
          </div>
        )}

        <div className="mt-8">
          <RealQuestionsCard
            sessionId={session.id}
            agency={agency}
            sector={session.sector}
          />
        </div>

        <div className="mt-8 text-center">
          <Link
            href={`/simulation?session_id=${session.id}`}
            className="inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Re-run the simulation
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Top summary */}
      <header className="rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {agency} readiness scorecard
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {session.issuer_name}
            </h1>
            {(session.industry || session.sub_type) && (
              <p className="mt-0.5 text-sm text-muted">
                {[session.sector, session.industry, session.sub_type]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            )}
            <p className="mt-1 text-sm text-muted">
              Simulated by {persona.name} — {persona.role} ({agency})
            </p>
            {!results && output && (
              <p className="mt-1 text-xs text-muted">
                Saved scorecard — per-answer grades from the live run are not
                retained.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Stat
              label="Readiness"
              value={
                session.overall_score != null
                  ? `${session.overall_score.toFixed(1)}/10`
                  : '—'
              }
              accent
            />
            <Stat
              label="Needs sharpening"
              value={results ? String(totalWeakFlags) : '—'}
            />
            <Stat label="Critical gaps" value={String(totalCriticalFlags)} />
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!output && !error && (
        <div className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
          Generating your scorecard — this typically takes about a minute. Keep
          this tab open.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* LEFT: per-factor breakdown */}
        <section>
          <h2 className="text-lg font-semibold">Factor-by-factor breakdown</h2>
          <div className="mt-4 flex flex-col gap-4">
            {(results
              ? results.map((r) => ({
                  factor: r.factor,
                  flags: r.flags as Flag[] | null,
                  analysis: output?.factor_analyses.find(
                    (a) => a.factor === r.factor
                  ),
                }))
              : (output?.factor_analyses ?? []).map((a) => ({
                  factor: a.factor,
                  flags: null,
                  analysis: a as ScorecardOutput['factor_analyses'][number] | undefined,
                }))
            ).map(({ factor, flags, analysis }) => {
              return (
                <article
                  key={factor}
                  className="rounded-lg border border-border bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{factor}</h3>
                    {flags && <FactorFlagSummary flags={flags} />}
                  </div>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-emerald-700">
                        Handled well
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {analysis?.handled_well ?? <Skeleton />}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-amber-700">Flagged</dt>
                      <dd className="mt-0.5 text-foreground">
                        {analysis?.flagged ?? <Skeleton />}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-brand">
                        Recommended action
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {analysis?.recommended_action ?? <Skeleton />}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>

          {(!output || (output.advocacy_points?.length ?? 0) > 0) && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">
                Narrative gaps &amp; advocacy points
              </h2>
              <p className="mt-1 text-sm text-muted">
                Credit-positive themes missing from your narrative, and
                arguments for a better ratings outcome worth raising with{' '}
                {agency}.
              </p>
              <div className="mt-4 rounded-lg border border-border bg-white p-5">
                <ul className="space-y-4 text-sm">
                  {output?.advocacy_points?.length
                    ? output.advocacy_points.slice(0, 6).map((p, i) => (
                        <li key={i} className="flex flex-col gap-1">
                          <span
                            className={[
                              'self-start rounded-full border px-2 py-0.5 text-xs font-medium',
                              p.basis === 'narrative_gap'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-brand/30 bg-brand/5 text-brand',
                            ].join(' ')}
                          >
                            {ADVOCACY_BASIS_LABELS[p.basis] ?? p.basis}
                          </span>
                          <span className="text-foreground">{p.point}</span>
                        </li>
                      ))
                    : [0, 1, 2, 3].map((i) => (
                        <li key={i}>
                          <Skeleton />
                        </li>
                      ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: committee memo + priority actions */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Draft committee memo
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {output?.committee_memo ?? <Skeleton lines={4} />}
            </p>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Priority prep
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              {output?.priority_actions?.length
                ? output.priority_actions.slice(0, 3).map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))
                : [0, 1, 2].map((i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
                        {i + 1}
                      </span>
                      <Skeleton />
                    </li>
                  ))}
            </ol>
          </section>

          <section className="rounded-lg border border-border bg-white p-5 print:hidden">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Next
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!output}
                title={
                  output ? undefined : 'Available once the scorecard finishes generating'
                }
                className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground"
              >
                Export to PDF
              </button>
              <Link
                href="/advisory"
                className="rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover"
              >
                Book advisory session
              </Link>
            </div>
            <p className="mt-2 text-xs text-muted">
              Export opens your browser&apos;s print dialog — choose “Save as
              PDF”. Generated locally; nothing is uploaded.
            </p>
          </section>

          {remainingAgencies.length > 0 && (
            <section className="rounded-lg border border-border bg-white p-5 print:hidden">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Run another agency
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {remainingAgencies.map((a) => (
                  <Link
                    key={a}
                    href={`/simulation?session_id=${session.id}`}
                    className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand"
                  >
                    Simulate {a}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Feedback capture lives on the return visit (dashboard → saved
              scorecard), after the real meeting has actually happened — not
              minutes after the simulation. */}
          {!results && (
            <RealQuestionsCard
              sessionId={session.id}
              agency={agency}
              sector={session.sector}
            />
          )}
        </aside>
      </div>

      {/* Ask the AI Ratings Coach */}
      <section className="mt-10 overflow-hidden rounded-lg border border-border bg-white print:hidden">
        <header className="border-b border-border bg-surface px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Ask the AI Ratings Coach
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Ask anything about this session — why a factor was flagged, how to
            prep an answer, what an analyst is likely to push back on. Draws on
            the simulation transcript, your proprietary knowledge overlay, and
            advisor notes.
          </p>
        </header>

        <div
          ref={coachScrollRef}
          className="flex max-h-[480px] flex-col gap-3 overflow-y-auto px-5 py-5"
        >
          {coachMessages.length === 0 && !coachLoading && (
            <div className="text-sm text-muted">
              <p>Try asking:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Why was my Funding and Liquidity answer flagged?</li>
                <li>
                  What's the strongest framing for our capital trajectory given
                  the outlook?
                </li>
                <li>
                  What is {agency} most likely to come back to on follow-up?
                </li>
              </ul>
            </div>
          )}

          {coachMessages.map((m, i) => (
            <CoachBubble key={i} role={m.role} content={m.content} />
          ))}

          {coachLoading && (
            <p className="text-xs text-muted">Coach is thinking…</p>
          )}

          {coachError && (
            <p className="text-sm text-red-600">{coachError}</p>
          )}
        </div>

        <form
          onSubmit={handleAskCoach}
          className="flex gap-2 border-t border-border px-5 py-4"
        >
          <input
            value={coachInput}
            onChange={(e) => setCoachInput(e.target.value)}
            placeholder="Ask the coach…"
            disabled={coachLoading}
            className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={coachLoading || !coachInput.trim()}
            className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Ask
          </button>
        </form>
      </section>
    </main>
  )
}

/**
 * Parse a JSON value from sessionStorage, returning the fallback on any
 * failure (missing key, corrupted value, storage unavailable). A corrupted
 * entry must not crash the scorecard render.
 */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * "After your real meeting" feedback capture. Rendered on return visits
 * (dashboard → saved scorecard), where the real meeting has plausibly
 * happened — not on the fresh post-simulation view.
 */
function RealQuestionsCard({
  sessionId,
  agency,
  sector,
}: {
  sessionId: string
  agency: Agency
  sector: string
}) {
  const [realQs, setRealQs] = useState('')
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSaveQs(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSavedCount(null)
    const res = await saveRealQuestions(sessionId, agency, sector, realQs)
    setSaving(false)
    if (res.error) {
      setSaveError(res.error)
    } else {
      setSavedCount(res.saved ?? 0)
      setRealQs('')
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 print:hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        After your real meeting
      </h2>
      <p className="mt-2 text-sm text-muted">
        Paste the actual questions {agency} asked, one per line. We use these
        to calibrate your future simulations.
      </p>
      <form onSubmit={handleSaveQs} className="mt-3 flex flex-col gap-2">
        <textarea
          value={realQs}
          onChange={(e) => setRealQs(e.target.value)}
          rows={5}
          placeholder="One question per line…"
          className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        {savedCount !== null && savedCount > 0 && (
          <p className="text-sm text-emerald-700">
            Saved {savedCount} question{savedCount === 1 ? '' : 's'}.
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !realQs.trim()}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save questions'}
        </button>
      </form>
    </section>
  )
}

function CoachBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant'
  content: string
}) {
  const isUser = role === 'user'
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
            Coach
          </p>
        )}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="text-right">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={[
          'mt-1 text-2xl font-semibold',
          accent ? 'text-brand' : 'text-foreground',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}

function FactorFlagSummary({ flags }: { flags: Flag[] }) {
  const strong = flags.filter((f) => f === 'strong').length
  const adequate = flags.filter((f) => f === 'adequate').length
  const weak = flags.filter((f) => f === 'weak').length
  const crit = flags.filter((f) => f === 'critical_gap').length
  if (strong + adequate + weak + crit === 0) {
    return <span className="text-xs text-muted">No flags</span>
  }
  return (
    <div className="flex gap-2 text-xs">
      {strong > 0 && (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
          {strong} strong
        </span>
      )}
      {adequate > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
          {adequate} adequate
        </span>
      )}
      {weak > 0 && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
          {weak} to sharpen
        </span>
      )}
      {crit > 0 && (
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">
          {crit} critical
        </span>
      )}
    </div>
  )
}

function Skeleton({ lines = 1 }: { lines?: number }) {
  return (
    <span className="inline-block w-full space-y-1.5 align-middle">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="block h-3 w-full animate-pulse rounded bg-border"
        />
      ))}
    </span>
  )
}
