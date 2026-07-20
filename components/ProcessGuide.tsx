'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Stage = {
  title: string
  timing: string
  body: string
  points?: string[]
  links?: Array<{ label: string; href: string }>
}

function transactionStages(sessionId: string): Stage[] {
  return [
    {
      title: 'Confidential pre-briefing',
      timing: 'Before any public announcement',
      body: 'Brief your lead analyst under confidentiality ahead of the announcement — agencies have established MNPI processes for exactly this. The cardinal sin is the agency reading your deal in the press first.',
      points: [
        'Best practice is giving the analyst ample time to review the transaction and provide feedback. Where sensitivity is enhanced — as it typically is for M&A — the briefing can happen right before the announcement; where the deal is complex, give the analyst the time to do the work.',
        'For ratings certainty ahead of announcement, consider a formal pre-assessment: a Rating Evaluation Service (RES) at S&P or a Rating Assessment Service (RAS) at Moody’s. Evaluate case by case — it lets you preview 3–6 scenarios with the agency to test different execution paths before you commit.',
        'Agree timing and logistics with the analyst early; a surprised agency is a defensive agency.',
      ],
    },
    {
      title: 'Prepare the transaction story',
      timing: 'The days before the meeting',
      body: 'Rationale, financing structure and why it was chosen, and the pro forma bridge — standalone versus pro forma metrics with the path back to targets. Pressure-test it before the real conversation.',
      links: [
        {
          label: 'Build the transaction story',
          href: `/narrative/builder?session_id=${sessionId}`,
        },
        {
          label: 'Run a simulated meeting',
          href: `/narrative?session_id=${sessionId}`,
        },
      ],
    },
    {
      title: 'The transaction meeting',
      timing: 'Usually right around announcement',
      body: 'Lead with the pro forma bridge — it is the first thing the analyst needs. Quantify; adjectives ("accretive", "manageable") read as unprepared.',
      points: [
        'Commit to a deleveraging path only if you can deliver it — it will be tracked and replayed at every future review.',
        'Never guess a figure in the room; commit to follow up and log the commitment.',
      ],
    },
    {
      title: 'Announcement day & rating action',
      timing: 'On or shortly after announcement',
      body: 'The agency publishes its take — affirmation, outlook change, or a watch placement. Coordinate your press-release timing with the analyst so the market hears both stories coherently.',
    },
    {
      title: 'Diligence sprint & committee',
      timing: 'The weeks after announcement',
      body: 'Follow-ups arrive on financing documents and projections. Any watch placement resolves as facts firm up — final financing, closing conditions. Answer precisely and fast; open items prolong the watch.',
    },
    {
      title: 'Post-close: deliver the path',
      timing: 'The quarters after close',
      body: 'Execute the deleveraging path you stated, update the agency at milestones, and get ahead of any deviation before it surfaces in the numbers. The next annual review starts from what you promised here.',
      links: [
        { label: 'Track your commitments', href: '/dashboard' },
      ],
    },
  ]
}

function firstRatingStages(sessionId: string): Stage[] {
  return [
    {
      title: 'Engagement & agency selection',
      timing: 'Typically 8–12 weeks before target issuance',
      body: 'Choose the agency, agree the engagement and fee letter, and sign. Which agency to approach is a real decision, not a formality.',
      links: [
        {
          label: 'Compare agency fit for your profile',
          href: `/narrative?session_id=${sessionId}`,
        },
      ],
    },
    {
      title: 'Information request & data room',
      timing: 'Right after engagement',
      body: 'The agency sends a substantial document request before anyone meets: historical financials, projections, funding agreements, risk policies, org and legal structure, board materials.',
      points: [
        'Assemble a clean data room early — completeness and speed here set the tone for the whole review.',
        'Expect the request to be broader than you think reasonable. That is normal.',
      ],
    },
    {
      title: 'Prepare your credit story',
      timing: '2–4 weeks before the meeting',
      body: 'Draft the narrative, pressure-test it against a simulated analyst, and rehearse as a team — including who speaks to which topic.',
      links: [
        {
          label: 'Build your credit story',
          href: `/narrative/builder?session_id=${sessionId}`,
        },
        {
          label: 'Run a simulated meeting',
          href: `/narrative?session_id=${sessionId}`,
        },
      ],
    },
    {
      title: 'Management diligence meeting',
      timing: 'The main event — usually 2–4 hours',
      body: 'You walk the lead analyst and backup through the story; they probe it. Candor beats polish: acknowledge weaknesses with their mitigants.',
      points: [
        'Never guess at a figure in the room — commit to follow up instead, and track that commitment.',
        'Your briefing book is the rehearsal script: anticipated questions with model answers in your numbers.',
      ],
    },
    {
      title: 'Follow-up questions',
      timing: 'Days to two weeks after the meeting',
      body: 'Written follow-ups arrive on whatever the meeting left open. Answer precisely and on time — open items delay committee.',
      points: [
        'Log what was actually asked and track every commitment you made in the meeting so nothing slips.',
      ],
    },
    {
      title: 'Rating committee',
      timing: '2–6 weeks after the meeting',
      body: 'You are not in the room. The lead analyst presents your credit story to the committee for you — the quality of your narrative and answers is your proxy voice.',
    },
    {
      title: 'Decision, appeal window & publication',
      timing: 'Shortly after committee',
      body: 'The outcome is delivered with the rationale. Two things first-timers often do not know:',
      points: [
        'There is a narrow appeal window — but appeals need new, material information, not disagreement.',
        'For a first rating you generally choose whether to publish or keep it confidential. If the outcome disappoints, that choice matters — a judgment call worth taking advice on.',
      ],
      links: [{ label: 'Book an advisory session', href: '/advisory' }],
    },
    {
      title: 'Surveillance & meaningful updates',
      timing: 'Ongoing after publication',
      body: 'The agency monitors the rating continuously. Brief your analyst ahead of market-moving announcements — M&A, large capital actions, strategy shifts. No surprises is the rule.',
      points: [
        'Keep the commitments you made in meetings visible — the agency will remember them at the next review.',
      ],
    },
    {
      title: 'Annual review cycle',
      timing: 'Every year thereafter',
      body: 'The annual management meeting is a focused update: what changed, progress against prior concerns. Re-drill your weak sections before each one and watch your readiness build.',
      links: [{ label: 'Your dashboard & readiness trajectory', href: '/dashboard' }],
    },
  ]
}

const VARIANTS = {
  first_rating: {
    stages: firstRatingStages,
    trigger: 'First rating? See the full process →',
    heading: 'Your first rating, start to finish',
    fallbackSubtitle:
      'The stages every debut issuer goes through — and where this tool helps.',
    // Key kept as `process:` for back-compat with saved first-rating progress.
    keyPrefix: 'process',
  },
  transaction: {
    stages: transactionStages,
    trigger: 'Transaction meeting? See the playbook →',
    heading: 'Your transaction, start to finish',
    fallbackSubtitle:
      'The choreography of a transaction review — and where this tool helps.',
    keyPrefix: 'process-txn',
  },
} as const

/**
 * Slide-over process guide (first-rating or transaction playbook). Progress
 * is device-local (localStorage) — nothing stored.
 */
export function ProcessGuide({
  sessionId,
  meetingDate,
  variant = 'first_rating',
}: {
  sessionId: string
  meetingDate: string | null
  variant?: keyof typeof VARIANTS
}) {
  const config = VARIANTS[variant]
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<number[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const storageKey = `${config.keyPrefix}:${sessionId}`

  const [daysToMeeting, setDaysToMeeting] = useState<number | null>(null)

  function openGuide() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setDone((JSON.parse(raw) as { done?: number[] }).done ?? [])
    } catch {
      // Corrupt state — start fresh.
    }
    setDaysToMeeting(
      meetingDate
        ? Math.ceil(
            (new Date(meetingDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : null
    )
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggleDone(i: number) {
    setDone((prev) => {
      const next = prev.includes(i)
        ? prev.filter((n) => n !== i)
        : [...prev, i]
      try {
        localStorage.setItem(storageKey, JSON.stringify({ done: next }))
      } catch {}
      return next
    })
  }

  const stages = config.stages(sessionId)
  const firstOpen = stages.findIndex((_, i) => !done.includes(i))

  return (
    <>
      <button
        type="button"
        onClick={openGuide}
        className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
      >
        {config.trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="First rating process guide"
            className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {config.heading}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {daysToMeeting !== null && daysToMeeting >= 0
                    ? `Your agency meeting is ${
                        daysToMeeting === 0
                          ? 'today'
                          : `in ${daysToMeeting} day${daysToMeeting === 1 ? '' : 's'}`
                      }.`
                    : config.fallbackSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-muted hover:border-brand hover:text-brand"
              >
                Close
              </button>
            </div>

            <ol className="flex-1 overflow-y-auto p-5">
              {stages.map((stage, i) => {
                const isDone = done.includes(i)
                const isExpanded =
                  expanded !== null ? expanded === i : i === firstOpen
                return (
                  <li
                    key={stage.title}
                    className={[
                      'relative pb-5 pl-9',
                      i < stages.length - 1
                        ? 'before:absolute before:bottom-0 before:left-[11px] before:top-7 before:w-px before:bg-border'
                        : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDone(i)}
                      aria-label={
                        isDone
                          ? `Mark "${stage.title}" not done`
                          : `Mark "${stage.title}" done`
                      }
                      className={[
                        'absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-border bg-white text-muted hover:border-brand',
                      ].join(' ')}
                    >
                      {isDone ? '✓' : i + 1}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? -1 : i)}
                      className="block w-full text-left"
                    >
                      <span
                        className={[
                          'text-sm font-medium',
                          isDone ? 'text-muted line-through' : 'text-foreground',
                        ].join(' ')}
                      >
                        {stage.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {stage.timing}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 text-sm leading-6 text-foreground">
                        <p>{stage.body}</p>
                        {stage.points && (
                          <ul className="mt-2 space-y-1.5">
                            {stage.points.map((p) => (
                              <li key={p} className="flex gap-2">
                                <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-brand" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        )}
                        {stage.links && (
                          <div className="mt-2.5 flex flex-col gap-1">
                            {stage.links.map((l) => (
                              <Link
                                key={l.href + l.label}
                                href={l.href}
                                className="text-sm font-medium text-brand hover:text-brand-hover"
                              >
                                {l.label} →
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            <p className="border-t border-border p-5 text-xs text-muted">
              Progress is saved only in this browser. Timing is typical, not
              guaranteed — your agency&apos;s schedule governs.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
