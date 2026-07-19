'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ProcessGuide } from '@/components/ProcessGuide'
import type {
  Agency,
  BuilderPromptSet,
  TransactionContext,
} from '@/lib/types'

export type BuilderSession = {
  id: string
  issuer_name: string
  ticker: string | null
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  meeting_date: string | null
  meeting_type: string
  transaction_context?: TransactionContext | null
}

const DEBUT_TITLE = 'Debut context'
const TXN_TITLE = 'The transaction'

// Answers keyed by `${stepTitle}|${promptIndex}`. Draft state lives only in
// this browser (localStorage) — same privacy promise as the paste flow.
type Draft = {
  promptSet: BuilderPromptSet | null
  answers: Record<string, string>
}

type Step = {
  title: string
  explainer: string
  prompts: string[]
}

export function BuilderWizard({ session }: { session: BuilderSession }) {
  const router = useRouter()
  const storageKey = `builder:${session.id}`
  const agency = session.agency[0]

  const [draft, setDraft] = useState<Draft | null>(null)
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [assembling, setAssembling] = useState(false)
  const [assembled, setAssembled] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fetchedRef = useRef(false)

  // Restore any saved draft, then fetch prompts if we don't have them yet.
  useEffect(() => {
    let restored: Draft = { promptSet: null, answers: {} }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) restored = JSON.parse(raw) as Draft
    } catch {
      // Corrupt draft — start fresh.
    }
    setDraft(restored)
  }, [storageKey])

  const sessionContext = useCallback(
    () => ({
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
    }),
    [session, agency]
  )

  useEffect(() => {
    if (!draft || draft.promptSet || fetchedRef.current) return
    fetchedRef.current = true
    setLoadingPrompts(true)
    setError(null)
    fetch('/api/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'prompts', session_context: sessionContext() }),
    })
      .then(async (res) => {
        const data = (await res.json()) as BuilderPromptSet & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Prompt generation failed.')
        setDraft((d) => {
          const next = { promptSet: data, answers: d?.answers ?? {} }
          try {
            localStorage.setItem(storageKey, JSON.stringify(next))
          } catch {}
          return next
        })
      })
      .catch((err) => {
        fetchedRef.current = false
        setError(err instanceof Error ? err.message : 'Prompt generation failed.')
      })
      .finally(() => setLoadingPrompts(false))
  }, [draft, sessionContext, storageKey])

  const steps: Step[] = draft?.promptSet
    ? [
        ...(draft.promptSet.debut_prompts?.length
          ? [
              {
                title: DEBUT_TITLE,
                explainer:
                  'Before the factors: the questions every first-time issuer gets about the decision to seek a rating.',
                prompts: draft.promptSet.debut_prompts,
              },
            ]
          : []),
        ...(draft.promptSet.transaction_prompts?.length
          ? [
              {
                title: TXN_TITLE,
                explainer:
                  'The meeting opens here: rationale, financing, and the pro forma bridge. Numbers beat adjectives.',
                prompts: draft.promptSet.transaction_prompts,
              },
            ]
          : []),
        ...draft.promptSet.factors.map((f) => ({
          title: f.factor,
          explainer: f.explainer,
          prompts: f.prompts,
        })),
      ]
    : []

  const onReview = stepIndex >= steps.length && steps.length > 0
  const step = onReview ? null : steps[stepIndex]

  function setAnswer(stepTitle: string, promptIndex: number, value: string) {
    setDraft((d) => {
      if (!d) return d
      const next = {
        ...d,
        answers: { ...d.answers, [`${stepTitle}|${promptIndex}`]: value },
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function answeredCount(s: Step): number {
    return s.prompts.filter((_, i) =>
      draft?.answers[`${s.title}|${i}`]?.trim()
    ).length
  }

  async function assemble() {
    if (!draft?.promptSet) return
    setAssembling(true)
    setError(null)
    try {
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assemble',
          session_context: sessionContext(),
          sections: steps.map((s) => ({
            title: s.title,
            responses: s.prompts.map((p, i) => ({
              prompt: p,
              answer: draft.answers[`${s.title}|${i}`] ?? '',
            })),
          })),
        }),
      })
      const data = (await res.json()) as { narrative?: string; error?: string }
      if (!res.ok || !data.narrative) {
        throw new Error(data.error ?? 'Drafting failed.')
      }
      setAssembled(data.narrative)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drafting failed.')
    } finally {
      setAssembling(false)
    }
  }

  function useStory() {
    if (!assembled?.trim()) return
    setSubmitting(true)
    // Same privacy path as the paste flow: sessionStorage only, never Supabase.
    sessionStorage.setItem(`narrative:${session.id}`, assembled)
    router.push(`/simulation?session_id=${session.id}`)
  }

  if (!draft || loadingPrompts || (!draft.promptSet && !error)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Preparing your guided prompts…
        </h1>
        <p className="mt-3 text-muted">
          Tailoring questions to {session.sector}
          {session.sub_type ? ` (${session.sub_type})` : ''} and what {agency}{' '}
          focuses on. This takes about half a minute.
        </p>
        <div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
        </div>
      </main>
    )
  }

  if (!draft.promptSet) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Couldn&apos;t prepare your prompts
        </h1>
        <p className="mt-3 text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            fetchedRef.current = false
            setDraft({ promptSet: null, answers: draft.answers })
          }}
          className="mt-6 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Build your credit story
          </h1>
          <p className="mt-2 text-muted">
            Answer what you can in bullet points or rough notes — the draft
            does the prose. Skip anything you&apos;re not ready for.
          </p>
        </div>
        {session.meeting_type === 'New Rating Request' && (
          <div className="w-full sm:w-64">
            <ProcessGuide
              sessionId={session.id}
              meetingDate={session.meeting_date}
            />
          </div>
        )}
        {session.meeting_type === 'Transaction Update' && (
          <div className="w-full sm:w-64">
            <ProcessGuide
              sessionId={session.id}
              meetingDate={session.meeting_date}
              variant="transaction"
            />
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Step nav */}
        <nav className="lg:border-r lg:border-border lg:pr-6">
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {steps.map((s, i) => {
              const active = !onReview && i === stepIndex
              const done = answeredCount(s) > 0
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => {
                      setAssembled(null)
                      setStepIndex(i)
                    }}
                    className={[
                      'w-full rounded-md px-3 py-2 text-left text-sm transition',
                      active
                        ? 'bg-brand/10 font-medium text-brand'
                        : 'text-muted hover:bg-surface hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={[
                          'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                          done ? 'bg-emerald-500' : 'bg-border',
                        ].join(' ')}
                      />
                      {s.title}
                    </span>
                  </button>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={() => setStepIndex(steps.length)}
                className={[
                  'w-full rounded-md px-3 py-2 text-left text-sm font-medium transition',
                  onReview
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted hover:bg-surface hover:text-foreground',
                ].join(' ')}
              >
                Review &amp; draft →
              </button>
            </li>
          </ol>
        </nav>

        {/* Active step */}
        {step ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {stepIndex + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.explainer}</p>

            <div className="mt-6 flex flex-col gap-5">
              {step.prompts.map((prompt, i) => (
                <label key={i} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {prompt}
                  </span>
                  <textarea
                    value={draft.answers[`${step.title}|${i}`] ?? ''}
                    onChange={(e) => setAnswer(step.title, i, e.target.value)}
                    rows={3}
                    placeholder="Bullet points are fine…"
                    className="rounded-md border border-border bg-white px-3 py-2.5 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </label>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                disabled={stepIndex === 0}
                className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                {answeredCount(step) > 0 ? 'Next' : 'Skip for now'}
              </button>
            </div>
          </section>
        ) : (
          /* Review & draft */
          <section>
            <h2 className="text-xl font-semibold">Review &amp; draft</h2>
            {assembled === null ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {steps.filter((s) => answeredCount(s) > 0).length} of{' '}
                  {steps.length} topics have answers. Topics you skipped come
                  back as bracketed placeholders in the draft — you can fill
                  them in later.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {steps.map((s) => (
                    <li key={s.title} className="flex items-center gap-2">
                      <span
                        className={[
                          'inline-block h-1.5 w-1.5 rounded-full',
                          answeredCount(s) > 0 ? 'bg-emerald-500' : 'bg-border',
                        ].join(' ')}
                      />
                      <span
                        className={
                          answeredCount(s) > 0
                            ? 'text-foreground'
                            : 'text-muted'
                        }
                      >
                        {s.title}
                        {answeredCount(s) > 0
                          ? ` — ${answeredCount(s)}/${s.prompts.length} answered`
                          : ' — skipped'}
                      </span>
                    </li>
                  ))}
                </ul>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={assemble}
                  disabled={
                    assembling ||
                    steps.every((s) => answeredCount(s) === 0)
                  }
                  className="mt-6 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {assembling ? 'Drafting your story…' : 'Draft my story'}
                </button>
                {assembling && (
                  <p className="mt-2 text-xs text-muted">
                    This takes about half a minute.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  Your draft, in management voice. Edit anything, fill the
                  bracketed placeholders you can, then take it into the
                  simulation.
                </p>
                <textarea
                  value={assembled}
                  onChange={(e) => setAssembled(e.target.value)}
                  rows={22}
                  className="mt-4 w-full rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={assemble}
                    disabled={assembling}
                    className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-60"
                  >
                    {assembling ? 'Redrafting…' : 'Redraft from answers'}
                  </button>
                  <button
                    type="button"
                    onClick={useStory}
                    disabled={submitting || !assembled.trim()}
                    className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {submitting
                      ? 'Loading simulation…'
                      : 'Use this story → Start simulation'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <p className="mt-10 text-xs text-muted">
        Your answers and draft are saved only in this browser. They are sent to
        the server solely to generate prompts and the draft, processed in
        memory, and never stored.
      </p>
    </main>
  )
}
