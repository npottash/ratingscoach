'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const STEPS = [
  { id: 1, label: 'Intake' },
  { id: 2, label: 'Narrative' },
  { id: 3, label: 'Simulation' },
  { id: 4, label: 'Scorecard' },
] as const

export type StepId = (typeof STEPS)[number]['id']

type StepIndicatorProps = {
  current: StepId
  /** Required for steps 2-4 to build the back-navigation URLs. */
  sessionId?: string
  /** Required for the scorecard step (4) to build the back-navigation URL. */
  agency?: string
  /** If set, clicking a past step asks for confirmation first. Use on the
   *  simulation page where going back loses the transcript. */
  confirmBack?: string
}

function urlForStep(
  stepId: StepId,
  sessionId: string | undefined,
  agency: string | undefined
): string {
  switch (stepId) {
    case 1:
      return '/intake'
    case 2:
      return sessionId ? `/narrative?session_id=${sessionId}` : '/intake'
    case 3:
      return sessionId ? `/simulation?session_id=${sessionId}` : '/intake'
    case 4:
      return sessionId && agency
        ? `/scorecard?session_id=${sessionId}&agency=${encodeURIComponent(agency)}`
        : '/intake'
  }
}

export function StepIndicator({
  current,
  sessionId,
  agency,
  confirmBack,
}: StepIndicatorProps) {
  const router = useRouter()
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  function handlePastClick(e: React.MouseEvent, url: string) {
    if (!confirmBack) return
    e.preventDefault()
    setPendingUrl(url)
  }

  function leave() {
    if (pendingUrl) router.push(pendingUrl)
    setPendingUrl(null)
  }

  return (
    <>
      <nav aria-label="Progress" className="border-b border-border bg-surface print:hidden">
        <ol className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-4 text-sm">
          {STEPS.map((step, idx) => {
            const isCurrent = step.id === current
            const isComplete = step.id < current
            const url = urlForStep(step.id, sessionId, agency)

            const badge = (
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent
                    ? 'bg-brand text-white'
                    : isComplete
                      ? 'bg-brand/15 text-brand'
                      : 'bg-white text-muted border border-border',
                ].join(' ')}
              >
                {step.id}
              </span>
            )

            const label = (
              <span
                className={
                  isCurrent
                    ? 'font-medium text-foreground'
                    : isComplete
                      ? 'text-foreground'
                      : 'text-muted'
                }
              >
                {step.label}
              </span>
            )

            const content = (
              <span className="flex items-center gap-3">
                {badge}
                {label}
              </span>
            )

            return (
              <li key={step.id} className="flex items-center gap-3">
                {isComplete ? (
                  <Link
                    href={url}
                    onClick={(e) => handlePastClick(e, url)}
                    className="-mx-1 rounded-md px-1 py-0.5 hover:bg-white/60 hover:text-foreground"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
                {idx < STEPS.length - 1 && (
                  <span className="mx-2 hidden h-px w-10 bg-border sm:block" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {pendingUrl && confirmBack && (
        <BackConfirmModal
          message={confirmBack}
          onCancel={() => setPendingUrl(null)}
          onLeave={leave}
        />
      )}
    </>
  )
}

function BackConfirmModal({
  message,
  onCancel,
  onLeave,
}: {
  message: string
  onCancel: () => void
  onLeave: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="back-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
        <h2
          id="back-confirm-title"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Go back?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
