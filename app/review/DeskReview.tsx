'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agency, DeskReviewOutput, TransactionContext } from '@/lib/types'

export type DeskReviewSession = {
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
  scorecard_output?: { desk_review?: DeskReviewOutput } | null
}

const ADVOCACY_BASIS_LABELS: Record<string, string> = {
  narrative_gap: 'Narrative gap',
  peer_benchmarking: 'Peer benchmarking',
  performance_trajectory: 'Trajectory',
  methodology: 'Methodology',
}

export function DeskReview({ session }: { session: DeskReviewSession }) {
  const agency = session.agency[0]
  const [review, setReview] = useState<DeskReviewOutput | null>(
    session.scorecard_output?.desk_review ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (review || startedRef.current) return
    startedRef.current = true
    // The narrative rides in sessionStorage from the narrative page — same
    // privacy path as the simulation; it is never stored server-side.
    const narrative = sessionStorage.getItem(`narrative:${session.id}`)
    if (!narrative?.trim()) {
      queueMicrotask(() => setMissing(true))
      return
    }
    fetch('/api/desk-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
          transaction_context: session.transaction_context,
        },
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as DeskReviewOutput & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Desk review failed.')
        setReview(data)
        // Persist the derived review (never the narrative) so revisits from
        // the dashboard can re-render it.
        try {
          const supabase = createClient()
          await supabase
            .from('sessions')
            .update({
              scorecard_output: {
                ...(session.scorecard_output ?? {}),
                desk_review: data,
              },
            })
            .eq('id', session.id)
        } catch {
          // Non-fatal — the review still renders this session.
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Desk review failed.')
      })
    // Intentionally run-once; inputs are fixed for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const simHref = (factors?: string[]) =>
    `/simulation?session_id=${session.id}&agency=${encodeURIComponent(agency)}${
      factors?.length ? `&factors=${encodeURIComponent(factors.join('|'))}` : ''
    }`

  if (missing) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your story isn&apos;t in this tab
        </h1>
        <p className="mt-3 text-muted">
          The narrative lives only in your browser and this tab doesn&apos;t
          have it. Head back, load your story, and try again.
        </p>
        <Link
          href={`/narrative?session_id=${session.id}`}
          className="mt-6 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Back to narrative
        </Link>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Couldn&apos;t complete the desk review
        </h1>
        <p className="mt-3 text-red-600">{error}</p>
        <Link
          href={`/narrative?session_id=${session.id}`}
          className="mt-6 inline-block rounded-md border border-border bg-white px-6 py-2.5 text-sm font-medium hover:border-brand hover:text-brand"
        >
          Back to narrative
        </Link>
      </main>
    )
  }

  if (!review) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reviewing your story…
        </h1>
        <p className="mt-3 text-muted">
          Reading your narrative the way a {agency} analyst would — factor by
          factor. This takes a couple of minutes; keep this tab open.
        </p>
        <div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
        </div>
      </main>
    )
  }

  const totalGaps = review.factor_reviews.reduce(
    (n, f) => n + f.gaps.length,
    0
  )

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Desk review · {agency} lens
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {session.issuer_name}
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              A read of the written story only — no meeting has happened, so
              there&apos;s no readiness score. That gets earned in the
              simulation.
            </p>
          </div>
          <Link
            href={simHref()}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Pressure-test it → Start simulation
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-foreground">
          {review.summary}
        </p>
      </header>

      {/* Per-factor review */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Factor by factor
          <span className="ml-2 text-sm font-normal text-muted">
            {totalGaps} gap{totalGaps === 1 ? '' : 's'} found
          </span>
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {review.factor_reviews.map((f) => (
            <div
              key={f.factor}
              className="flex flex-col rounded-lg border border-border bg-white p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{f.factor}</h3>
                {f.gaps.length === 0 && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Covered
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">
                <span className="font-medium text-muted">
                  What they&apos;ll probe:{' '}
                </span>
                {f.what_they_probe}
              </p>
              {f.gaps.length > 0 && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Gaps in the written story
                  </p>
                  <ul className="mt-1 space-y-1.5 text-sm">
                    {f.gaps.map((g) => (
                      <li key={g} className="flex gap-2">
                        <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                        {g}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={simHref([f.factor])}
                    className="mt-3 text-sm font-medium text-brand hover:text-brand-hover"
                  >
                    Pressure-test this factor →
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Advocacy */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Advocacy angles</h2>
        <p className="mt-1 text-sm text-muted">
          Arguments worth making proactively — built only on confirmed
          material.
        </p>
        <ul className="mt-4 space-y-3">
          {review.advocacy_points.map((p) => (
            <li
              key={p.point}
              className="rounded-lg border border-border bg-white p-4 text-sm leading-6"
            >
              <span className="mr-2 inline-block rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                {ADVOCACY_BASIS_LABELS[p.basis] ?? p.basis}
              </span>
              {p.point}
            </li>
          ))}
        </ul>
      </section>

      {/* Funnel to the simulation */}
      <section className="mt-10 rounded-lg border border-brand/40 bg-brand/5 p-6 text-center">
        <h2 className="text-lg font-semibold">
          The desk review reads the story. The simulation tests you on it.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
          A simulated {agency} analyst will probe these exact gaps live —
          and you&apos;ll leave with the scored scorecard, briefing book, and
          re-drills this review can&apos;t give you.
        </p>
        <Link
          href={simHref()}
          className="mt-4 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Start the full simulation
        </Link>
        <p className="mt-3 text-xs text-muted">
          Generated {new Date(review.generated_at).toLocaleDateString()} ·
          desk reviews are saved to your dashboard; your narrative never is.
        </p>
      </section>
    </main>
  )
}
