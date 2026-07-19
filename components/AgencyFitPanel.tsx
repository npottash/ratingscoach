'use client'

import { useEffect, useRef, useState } from 'react'
import type { Agency, AgencyFitOutput } from '@/lib/types'

export type AgencyFitRequest = {
  context: {
    issuer_name?: string | null
    sector: string
    industry?: string | null
    sub_type?: string | null
    current_rating?: string | null
    outlook?: string | null
    ticker?: string | null
    meeting_type?: string | null
  }
  narrative?: string
  current_agency?: Agency
}

/**
 * Modal overlay that fetches and renders the three-agency fit comparison.
 * `onPick` (when provided) lets the user act on the recommendation — select
 * at intake, or switch the session's agency on the narrative page.
 */
export function AgencyFitPanel({
  request,
  currentAgency,
  pickLabel,
  onPick,
  onClose,
}: {
  request: AgencyFitRequest
  currentAgency: Agency
  pickLabel: (agency: Agency) => string
  onPick?: (agency: Agency) => void | Promise<void>
  onClose: () => void
}) {
  const [result, setResult] = useState<AgencyFitOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState<Agency | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch('/api/agency-fit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(async (res) => {
        const data = (await res.json()) as AgencyFitOutput & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.')
        setResult(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Analysis failed.')
      })
    // request is captured on first render only; the panel is remounted per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function pick(agency: Agency) {
    if (!onPick) return
    setPicking(agency)
    try {
      await onPick(agency)
      onClose()
    } finally {
      setPicking(null)
    }
  }

  const byRanking = result
    ? result.ranking
        .map((a) => result.comparison.find((c) => c.agency === a))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Agency fit comparison"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl rounded-lg border border-border bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Which agency fits best?
            </h2>
            {result && (
              <p className="mt-1 text-sm text-muted">
                {result.preliminary
                  ? 'Preliminary — based on your sector profile. Rerun after your credit story is in for an issuer-specific read.'
                  : 'Based on your credit story and how each agency approaches it.'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-muted hover:border-brand hover:text-brand"
          >
            Close
          </button>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : !result ? (
          <div className="py-16 text-center">
            <p className="font-medium">Comparing S&amp;P, Moody&apos;s, and Fitch…</p>
            <p className="mt-1 text-sm text-muted">
              Weighing each agency&apos;s approach against your profile. This
              takes about half a minute.
            </p>
            <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-border">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-lg border border-brand/40 bg-brand/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                Recommendation: {result.ranking[0]}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-foreground">
                {result.recommendation_rationale}
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {byRanking.map((entry, i) => {
                const isCurrent = entry.agency === currentAgency
                return (
                  <div
                    key={entry.agency}
                    className={[
                      'flex flex-col rounded-lg border p-4',
                      i === 0 ? 'border-brand/50' : 'border-border',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{entry.agency}</p>
                      <span className="text-xs text-muted">
                        #{i + 1}
                        {isCurrent ? ' · selected' : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {entry.methodology_take}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Constructive
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {entry.constructive_signals.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Watch-outs
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {entry.watchouts.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted">
                      {entry.basis === 'tracked_intel'
                        ? 'Based on our tracked agency intel'
                        : 'Based on published criteria'}
                    </p>
                    {onPick && (
                      <button
                        type="button"
                        onClick={() => pick(entry.agency)}
                        disabled={picking !== null || isCurrent}
                        className={[
                          'mt-4 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50',
                          i === 0 && !isCurrent
                            ? 'bg-brand text-white hover:bg-brand-hover'
                            : 'border border-border bg-white text-foreground hover:border-brand hover:text-brand',
                        ].join(' ')}
                      >
                        {isCurrent
                          ? 'Currently selected'
                          : picking === entry.agency
                            ? 'Selecting…'
                            : pickLabel(entry.agency)}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="mt-5 text-xs leading-5 text-muted">
              Directional fit assessment only — how each agency&apos;s
              methodology and sector posture align with your profile. It is not
              a prediction of the rating any agency would assign.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
