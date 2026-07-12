import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/PageHeader'
import { signOut } from './actions'
import { DeleteSessionButton } from './DeleteSessionButton'
import type { Agency } from '@/lib/types'

type SessionRow = {
  id: string
  issuer_name: string
  agency: Agency[] | null
  meeting_date: string | null
  overall_score: number | null
  status: string
  created_at: string
  // Present on runs completed after scorecard persistence shipped.
  scorecard_output?: unknown
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Proxy already gates /dashboard, but a defensive redirect keeps the page
  // safe to render in any code path.
  if (!user) redirect('/login')

  // RLS scopes to the requesting user automatically. select('*') so the page
  // tolerates the scorecard_output column not having been migrated yet.
  const { data: sessionsRaw } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })

  const sessions: SessionRow[] = sessionsRaw ?? []

  return (
    <>
      <PageHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span>
              Signed in as{' '}
              <span className="font-medium text-foreground">{user.email}</span>
            </span>
            <span aria-hidden>·</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-brand hover:text-brand-hover"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin(user.email) && (
            <span className="flex items-center gap-3 text-sm text-muted">
              <span className="text-xs font-semibold uppercase tracking-wide">
                Admin
              </span>
              <Link
                href="/admin/browse"
                className="text-brand hover:text-brand-hover"
              >
                Browse
              </Link>
              <Link
                href="/admin/ingest"
                className="text-brand hover:text-brand-hover"
              >
                Ingest
              </Link>
            </span>
          )}
          <Link
            href="/intake"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            New session
          </Link>
        </div>
      </header>

      <ProgressSection sessions={sessions} />

      <section className="mt-10">
        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <SessionsTable sessions={sessions} />
        )}
      </section>
      </main>
    </>
  )
}

/* ------------------------------------------------------------------------- */
/* Readiness trajectory                                                      */
/* ------------------------------------------------------------------------- */

type TrendGroup = {
  issuer: string
  agency: string
  scores: number[]
}

function ProgressSection({ sessions }: { sessions: SessionRow[] }) {
  // Group completed, scored runs by issuer × agency, oldest first.
  const groups = new Map<string, TrendGroup>()
  for (const s of [...sessions].reverse()) {
    if (s.status !== 'completed' || s.overall_score == null) continue
    const agency = s.agency?.[0] ?? '—'
    const key = `${s.issuer_name}|${agency}`
    const g = groups.get(key) ?? { issuer: s.issuer_name, agency, scores: [] }
    g.scores.push(s.overall_score)
    groups.set(key, g)
  }
  const trends = [...groups.values()].filter((g) => g.scores.length >= 2)
  if (trends.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Readiness trajectory
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((g) => {
          const first = g.scores[0]
          const latest = g.scores[g.scores.length - 1]
          const delta = latest - first
          return (
            <div
              key={`${g.issuer}|${g.agency}`}
              className="rounded-lg border border-border bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">
                  {g.issuer}{' '}
                  <span className="font-normal text-muted">· {g.agency}</span>
                </p>
                <span
                  className={[
                    'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
                    delta >= 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700',
                  ].join(' ')}
                >
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(1)}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <Sparkline scores={g.scores} />
                <p className="text-sm text-muted">
                  {first.toFixed(1)} →{' '}
                  <span className="font-semibold text-foreground">
                    {latest.toFixed(1)}
                  </span>
                  <span className="text-xs"> /10</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {g.scores.length} runs
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Sparkline({ scores }: { scores: number[] }) {
  const w = 140
  const h = 36
  const pad = 3
  const step = (w - pad * 2) / Math.max(scores.length - 1, 1)
  const y = (v: number) => h - pad - (Math.min(Math.max(v, 0), 10) / 10) * (h - pad * 2)
  const points = scores
    .map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand"
      />
      {scores.map((v, i) => (
        <circle
          key={i}
          cx={pad + i * step}
          cy={y(v)}
          r="2.5"
          className="fill-brand"
        />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------------- */
/* Sub-components                                                            */
/* ------------------------------------------------------------------------- */

function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-surface px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Your sessions
        </h2>
      </div>

      {/* Desktop: table. Hidden below md, where the columns and the primary
          action would clip off the right edge. */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Issuer</th>
              <th className="px-5 py-3">Agency</th>
              <th className="px-5 py-3">Meeting date</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-surface/60">
                <td className="px-5 py-3 font-medium text-foreground">
                  {s.issuer_name}
                </td>
                <td className="px-5 py-3 text-muted">
                  {s.agency && s.agency.length > 0
                    ? s.agency.join(', ')
                    : '—'}
                </td>
                <td className="px-5 py-3 text-muted">
                  {formatMeetingDate(s.meeting_date)}
                </td>
                <td className="px-5 py-3">
                  <ScorePill score={s.overall_score} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <SessionAction session={s} />
                </td>
                <td className="px-5 py-3 text-right">
                  <DeleteSessionButton
                    sessionId={s.id}
                    issuerName={s.issuer_name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards. Every row's primary action stays reachable. */}
      <ul className="divide-y divide-border md:hidden">
        {sessions.map((s) => (
          <li key={s.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {s.issuer_name}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {s.agency && s.agency.length > 0
                    ? s.agency.join(', ')
                    : '—'}
                  {' · '}
                  {formatMeetingDate(s.meeting_date)}
                </p>
              </div>
              <DeleteSessionButton
                sessionId={s.id}
                issuerName={s.issuer_name}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                <ScorePill score={s.overall_score} />
              </div>
              <SessionAction session={s} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-muted">—</span>
  }
  const cls =
    score >= 8
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 6
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        cls,
      ].join(' ')}
    >
      {score.toFixed(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    intake: {
      label: 'Setup',
      cls: 'bg-surface text-muted border-border',
    },
    completed: {
      label: 'Completed',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  }
  const entry =
    map[status] ?? { label: status, cls: 'bg-surface text-muted border-border' }
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        entry.cls,
      ].join(' ')}
    >
      {entry.label}
    </span>
  )
}

function SessionAction({ session }: { session: SessionRow }) {
  if (
    session.status === 'completed' &&
    session.agency &&
    session.agency.length > 0
  ) {
    const agency = encodeURIComponent(session.agency[0])
    return (
      <span className="inline-flex items-center gap-3">
        <Link
          href={`/scorecard?session_id=${session.id}&agency=${agency}`}
          className="font-medium text-brand hover:text-brand-hover"
        >
          View scorecard
        </Link>
        {session.scorecard_output != null && (
          <Link
            href={`/scorecard?session_id=${session.id}&agency=${agency}&print=1`}
            className="font-medium text-brand hover:text-brand-hover"
            title="Open the scorecard and print / save as PDF"
          >
            PDF
          </Link>
        )}
      </span>
    )
  }
  if (session.status === 'intake') {
    return (
      <Link
        href={`/narrative?session_id=${session.id}`}
        className="font-medium text-brand hover:text-brand-hover"
      >
        Continue
      </Link>
    )
  }
  return <span className="text-muted">—</span>
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-white px-6 py-14 text-center">
      <div className="mx-auto h-28 w-28 text-border">
        <EmptyIllustration />
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">
        No sessions yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Prep for your next rating agency meeting with a guided simulation, a
        readiness scorecard, and tailored advice. Start with the issuer and
        meeting details.
      </p>
      <Link
        href="/intake"
        className="mt-6 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Start your first session
      </Link>
    </div>
  )
}

function EmptyIllustration() {
  // Simple line-art clipboard with ascending bar chart inside. Uses
  // `currentColor` so it picks up the muted border tone via parent.
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="22" y="22" width="84" height="96" rx="6" />
      <rect x="46" y="12" width="36" height="18" rx="4" fill="white" />
      <line x1="40" y1="46" x2="88" y2="46" strokeWidth="1.5" />
      <line x1="40" y1="56" x2="76" y2="56" strokeWidth="1.5" />
      <rect x="38" y="84" width="10" height="16" rx="1" />
      <rect x="54" y="74" width="10" height="26" rx="1" />
      <rect x="70" y="64" width="10" height="36" rx="1" />
      <rect x="86" y="78" width="10" height="22" rx="1" />
    </svg>
  )
}

function formatMeetingDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
