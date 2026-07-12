'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PERSONAS } from '@/lib/personas'
import { createClient } from '@/lib/supabase/client'
import { CommitmentsCard } from './CommitmentsCard'
import { saveRealQuestions } from './actions'
import type { ViewId } from './views'
import type { Agency, BriefingOutput } from '@/lib/types'

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
  // Present once a briefing book has been generated for this run.
  briefing?: BriefingOutput
}

const AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']


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
  initialView,
}: {
  session: ScorecardSession
  agency: Agency
  autoPrint?: boolean
  initialView?: ViewId
}) {
  const persona = PERSONAS[agency]

  const [results, setResults] = useState<FactorResult[] | null>(null)
  const [output, setOutput] = useState<ScorecardOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [view, setView] = useState<ViewId>(initialView ?? 'factors')
  const [factorLayout, setFactorLayout] = useState<'cards' | 'table'>('cards')
  const [briefing, setBriefing] = useState<BriefingOutput | null>(
    session.scorecard_output?.briefing ?? null
  )
  const [briefingBusy, setBriefingBusy] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)

  async function handleGenerateBriefing() {
    if (!results || !output || briefingBusy) return
    const narrative = sessionStorage.getItem(`narrative:${session.id}`)
    if (!narrative) {
      setBriefingError(
        'The narrative is no longer in this tab — re-run the simulation to generate a briefing book.'
      )
      return
    }
    setBriefingBusy(true)
    setBriefingError(null)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          narrative,
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
          advocacy_points: output.advocacy_points,
          priority_actions: output.priority_actions,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: '' }))
        throw new Error(msg || `Request failed (${res.status})`)
      }
      const b = (await res.json()) as BriefingOutput
      setBriefing(b)
      try {
        const supabase = createClient()
        await supabase
          .from('sessions')
          .update({ scorecard_output: { ...output, briefing: b } })
          .eq('id', session.id)
      } catch {
        // Non-fatal — the briefing still renders this session.
      }
    } catch (e) {
      setBriefingError(
        e instanceof Error ? e.message : 'Briefing generation failed'
      )
    } finally {
      setBriefingBusy(false)
    }
  }

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

  // Factors that drew weak or critical flags — the re-drill set.
  const weakFactors = (results ?? [])
    .filter((r) => r.flags.some((f) => f === 'weak' || f === 'critical_gap'))
    .map((r) => r.factor)

  // One row per factor, usable by both the card and table layouts.
  const factorRows = results
    ? results.map((r) => ({
        factor: r.factor,
        flags: r.flags as Flag[] | null,
        analysis: output?.factor_analyses.find((a) => a.factor === r.factor),
      }))
    : (output?.factor_analyses ?? []).map((a) => ({
        factor: a.factor,
        flags: null,
        analysis: a as ScorecardOutput['factor_analyses'][number] | undefined,
      }))

  const gapPoints = (output?.advocacy_points ?? []).filter(
    (p) => p.basis === 'narrative_gap'
  )
  const advocacyOnlyPoints = (output?.advocacy_points ?? []).filter(
    (p) => p.basis !== 'narrative_gap'
  )

  // Sidebar table of contents. "After the meeting" only appears on the
  // return visit (archived view), matching where those cards render.
  const navItems: Array<{ id: ViewId; label: string; count?: number }> = [
    {
      id: 'factors',
      label: 'Section Feedback',
      count: factorRows.length || undefined,
    },
    {
      id: 'advocacy',
      label: 'Gaps & Advocacy',
      count: output?.advocacy_points?.length,
    },
    { id: 'memo', label: 'Illustrative Credit Memo' },
    { id: 'checklist', label: 'Priorities Prep Checklist' },
    { id: 'briefing', label: 'Briefing Book' },
    { id: 'advisory', label: 'Advisory Session' },
    { id: 'next', label: 'Next steps' },
    ...(!results
      ? [{ id: 'debrief' as ViewId, label: 'After the meeting' }]
      : []),
  ]

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

        <div className="mt-8 flex flex-col gap-6">
          <RealQuestionsCard
            sessionId={session.id}
            agency={agency}
            sector={session.sector}
          />
          <CommitmentsCard issuerName={session.issuer_name} agency={agency} />
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[210px_1fr]">
        {/* Sidebar table of contents. All sections stay mounted (hidden when
            inactive, visible in print) so Export to PDF captures everything. */}
        <nav className="print:hidden lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setView(item.id)}
                  className={[
                    'flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium',
                    view === item.id
                      ? 'bg-brand text-white'
                      : 'text-foreground hover:bg-surface',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  {item.count != null && (
                    <span
                      className={[
                        'rounded-full px-1.5 text-xs',
                        view === item.id
                          ? 'bg-white/20 text-white'
                          : 'bg-surface text-muted',
                      ].join(' ')}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
        {/* Section feedback (per-factor) */}
        <section className={view === 'factors' ? 'block' : 'hidden print:block'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Section Feedback</h2>
            <div className="flex rounded-md border border-border bg-white p-0.5 text-xs font-medium print:hidden">
              {(['cards', 'table'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFactorLayout(mode)}
                  className={[
                    'rounded px-3 py-1 capitalize',
                    factorLayout === mode
                      ? 'bg-brand text-white'
                      : 'text-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          {factorLayout === 'table' ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 text-emerald-700">Handled well</th>
                    <th className="px-4 py-3 text-amber-700">Flagged</th>
                    <th className="px-4 py-3 text-brand">Recommended action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border align-top">
                  {factorRows.map(({ factor, flags, analysis }) => (
                    <tr key={factor} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{factor}</p>
                        {flags && (
                          <div className="mt-1.5">
                            <FactorFlagSummary flags={flags} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {analysis?.handled_well ?? <Skeleton />}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {analysis?.flagged ?? <Skeleton />}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {analysis?.recommended_action ?? <Skeleton />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="mt-4 flex flex-col gap-4">
            {factorRows.map(({ factor, flags, analysis }) => {
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
          )}
        </section>

        {/* Narrative gaps & advocacy points */}
        <section
          className={view === 'advocacy' ? 'block' : 'hidden print:mt-8 print:block'}
        >
          <h2 className="text-lg font-semibold">
            Gaps &amp; Advocacy
          </h2>
          <p className="mt-1 text-sm text-muted">
            Credit-positive themes missing from your narrative, and arguments
            for a better ratings outcome worth raising with {agency}.
          </p>
          {output && (output.advocacy_points?.length ?? 0) === 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-white p-5">
              <p className="text-sm text-muted">
                Gaps and advocacy points aren&apos;t available for this run —
                re-run the simulation to generate them.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Narrative gaps
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Themes clearly missing from your materials — address them
                  proactively.
                </p>
                <ul className="mt-3 space-y-3 text-sm">
                  {output ? (
                    gapPoints.length > 0 ? (
                      gapPoints.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-400">—</span>
                          <span className="text-foreground">{p.point}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">
                        No narrative gaps identified for this run.
                      </li>
                    )
                  ) : (
                    [0, 1].map((i) => (
                      <li key={i}>
                        <Skeleton />
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Advocacy points
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Arguments for a better ratings outcome, ready to make to{' '}
                  {agency}.
                </p>
                <ul className="mt-3 space-y-3 text-sm">
                  {output ? (
                    advocacyOnlyPoints.length > 0 ? (
                      advocacyOnlyPoints.map((p, i) => (
                        <li key={i} className="flex flex-col gap-1">
                          <span className="self-start rounded-full border border-brand/30 bg-brand/5 px-2 py-0.5 text-xs font-medium text-brand">
                            {ADVOCACY_BASIS_LABELS[p.basis] ?? p.basis}
                          </span>
                          <span className="text-foreground">{p.point}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">
                        No advocacy points identified for this run.
                      </li>
                    )
                  ) : (
                    [0, 1].map((i) => (
                      <li key={i}>
                        <Skeleton />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Illustrative credit memo */}
        <section
          className={view === 'memo' ? 'block' : 'hidden print:mt-8 print:block'}
        >
          <h2 className="text-lg font-semibold">Illustrative Credit Memo</h2>
          <p className="mt-1 text-sm text-muted">
            How the analyst might summarize this credit for an internal rating
            committee, based on the session.
          </p>
          <div className="mt-4 max-w-3xl rounded-lg border border-border bg-white p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {output?.committee_memo ?? <Skeleton lines={5} />}
            </p>
          </div>
        </section>

        {/* Priorities prep checklist */}
        <section
          className={
            view === 'checklist' ? 'block' : 'hidden print:mt-8 print:block'
          }
        >
          <h2 className="text-lg font-semibold">Priorities Prep Checklist</h2>
          <p className="mt-1 text-sm text-muted">
            Your to-do list ahead of the meeting — check items off as you
            complete them.
          </p>
          <div className="mt-4 max-w-3xl rounded-lg border border-border bg-white p-6">
            {output?.priority_actions?.length ? (
              <PrepChecklist
                sessionId={session.id}
                items={output.priority_actions.slice(0, 3)}
              />
            ) : (
              <ul className="space-y-3 text-sm">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skeleton />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Briefing book */}
        <section
          className={
            (view === 'briefing' ? 'block' : 'hidden') + ' print:hidden'
          }
        >
          <h2 className="text-lg font-semibold">Briefing Book</h2>
          <p className="mt-1 text-sm text-muted">
            A meeting-ready prep document generated from this session — the
            binder your team rehearses from and circulates ahead of the real
            meeting.
          </p>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg border border-border bg-white p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                What&apos;s inside
              </h3>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                <li>
                  <span className="font-medium">
                    Suggested opening statement
                  </span>{' '}
                  — a 60–90 second meeting opening in management voice,
                  tailored to your meeting type.
                </li>
                <li>
                  <span className="font-medium">
                    Anticipated Q&amp;A with model answers
                  </span>{' '}
                  — the questions the analyst actually asked in this
                  simulation plus the likely follow-ups, grouped by section,
                  each with a drafted answer built only from your narrative
                  and session answers — nothing invented.
                </li>
                <li>
                  <span className="font-medium">Bracketed placeholders</span>{' '}
                  — where a needed fact wasn&apos;t in your materials, the
                  answer marks exactly what to gather (e.g. &quot;[insert LTM
                  charge-off rate]&quot;) rather than guessing.
                </li>
                <li>
                  <span className="font-medium">
                    Advocacy points and priority prep
                  </span>{' '}
                  — your gaps-and-advocacy analysis and prep priorities ride
                  along, so the whole story travels in one document.
                </li>
                <li>
                  <span className="font-medium">PDF export</span> — print or
                  save the book to circulate to the CFO, IR, and the rest of
                  the meeting team.
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              {briefing ? (
                <>
                  <p className="text-sm text-muted">
                    Generated{' '}
                    {new Date(briefing.generated_at).toLocaleDateString()}.
                  </p>
                  <Link
                    href={`/briefing?session_id=${session.id}`}
                    className="rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover"
                  >
                    View &amp; download
                  </Link>
                </>
              ) : results ? (
                <>
                  <button
                    type="button"
                    onClick={handleGenerateBriefing}
                    disabled={!output || briefingBusy}
                    title={
                      output
                        ? undefined
                        : 'Available once the scorecard finishes generating'
                    }
                    className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {briefingBusy ? 'Generating…' : 'Generate briefing book'}
                  </button>
                  <p className="text-xs text-muted">
                    Generation takes a minute or two — it drafts a model
                    answer for every anticipated question.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  No briefing book was generated for this run. Generate one
                  from the scorecard right after a live simulation.
                </p>
              )}
              {briefingError && (
                <p className="text-sm text-red-600">{briefingError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Advisory session */}
        <section
          className={
            (view === 'advisory' ? 'block' : 'hidden') + ' print:hidden'
          }
        >
          <h2 className="text-lg font-semibold">Advisory Session</h2>
          <p className="mt-1 text-sm text-muted">
            The simulator gets you reps. For the meetings that matter most,
            work directly with a senior credit ratings advisor who has sat on
            the other side of the table.
          </p>
          <div className="mt-4 max-w-3xl rounded-lg border border-border bg-white p-6">
            <ul className="space-y-3 text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  <span className="font-medium">
                    A senior advisor works through this session with you
                  </span>{' '}
                  — your credit story, your scorecard, the flagged answers,
                  and the advocacy points, with the materials you choose to
                  bring.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  <span className="font-medium">
                    Agency-specific coaching for {agency}
                  </span>{' '}
                  — methodology, the pushback you should expect, and the
                  framing that lands with their committee.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  <span className="font-medium">A tailored prep plan</span>{' '}
                  — a concrete sequence for the weeks leading into the
                  meeting, built around your weak factors and runway.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/advisory"
                className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Book an advisory session
              </Link>
              <span className="text-xs text-muted">
                A separate, paid engagement — pricing is confirmed with you
                before anything is scheduled.
              </span>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section
          className={
            (view === 'next' ? 'block' : 'hidden') + ' print:hidden'
          }
        >
          <h2 className="text-lg font-semibold">Next steps</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {results && weakFactors.length > 0 && (
              <NextStepCard
                title={`Re-drill weak factors (${weakFactors.length})`}
                description="A focused session covering only the factors flagged weak or critical in this run."
              >
                <Link
                  href={`/simulation?session_id=${session.id}&agency=${encodeURIComponent(agency)}&factors=${encodeURIComponent(weakFactors.join('|'))}`}
                  className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-medium hover:border-brand hover:text-brand"
                >
                  Start re-drill
                </Link>
              </NextStepCard>
            )}

            <NextStepCard
              title="Export to PDF"
              description="Print or save the full scorecard — all sections included. Generated locally; nothing is uploaded."
            >
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!output}
                title={
                  output
                    ? undefined
                    : 'Available once the scorecard finishes generating'
                }
                className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground"
              >
                Export
              </button>
            </NextStepCard>

            <NextStepCard
              title="Run another agency"
              description="Same issuer and credit story, simulated against a different agency's posture and methodology."
            >
              <div className="flex flex-col gap-2">
                {AGENCIES.filter((a) => a !== agency).map((a) => (
                  <Link
                    key={a}
                    href={`/simulation?session_id=${session.id}&agency=${encodeURIComponent(a)}`}
                    className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-medium hover:border-brand hover:text-brand"
                  >
                    Simulate {a}
                  </Link>
                ))}
              </div>
            </NextStepCard>
          </div>
        </section>

        {/* Feedback capture lives on the return visit (dashboard → saved
            scorecard), after the real meeting has actually happened — not
            minutes after the simulation. */}
        {!results && (
          <section
            className={
              (view === 'debrief' ? 'block' : 'hidden') + ' print:hidden'
            }
          >
            <h2 className="text-lg font-semibold">After the meeting</h2>
            <div className="mt-4 flex max-w-2xl flex-col gap-6">
              <RealQuestionsCard
                sessionId={session.id}
                agency={agency}
                sector={session.sector}
              />
              <CommitmentsCard
                issuerName={session.issuer_name}
                agency={agency}
              />
            </div>
          </section>
        )}
        </div>
      </div>

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
        Let us know the actual questions {agency} asked or where they focused
        their attention, one per line. We use these to calibrate your future
        simulations.
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

/** One action card in the Next steps grid: title, context, then the action. */
function NextStepCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-white p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">
        {description}
      </p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

/**
 * Priority actions as a checkable to-do list. Checked state persists in
 * localStorage per session, so it survives revisits in the same browser.
 */
function PrepChecklist({
  sessionId,
  items,
}: {
  sessionId: string
  items: string[]
}) {
  const storageKey = `prep_checklist:${sessionId}`
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? (JSON.parse(raw) as boolean[]) : []
      return items.map((_, i) => parsed[i] ?? false)
    } catch {
      return items.map(() => false)
    }
  })

  function toggle(i: number) {
    const next = done.map((d, j) => (j === i ? !d : d))
    setDone(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Storage unavailable — checklist still works for this view.
    }
  }

  const remaining = done.filter((d) => !d).length

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={done[i] ?? false}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand,#1d4ed8)]"
              />
              <span
                className={
                  done[i]
                    ? 'text-muted line-through'
                    : 'text-foreground'
                }
              >
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        {remaining === 0
          ? 'All prep items complete — you are ready for the meeting.'
          : `${remaining} of ${items.length} remaining.`}
      </p>
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
