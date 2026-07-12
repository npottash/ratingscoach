import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/PageHeader'
import { PrintButton } from './PrintButton'
import type { Agency, BriefingOutput } from '@/lib/types'

type ScorecardOutputWithBriefing = {
  committee_memo?: string
  priority_actions?: string[]
  advocacy_points?: Array<{ basis: string; point: string }>
  briefing?: BriefingOutput
}

type BriefingSession = {
  id: string
  issuer_name: string
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  meeting_type: string | null
  meeting_date: string | null
  scorecard_output: ScorecardOutputWithBriefing | null
}

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/dashboard')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single<BriefingSession>()
  if (!session) redirect('/dashboard')

  const briefing = session.scorecard_output?.briefing
  const agency = session.agency?.[0] ?? 'the agency'

  if (!briefing) {
    return (
      <>
        <PageHeader />
        <main className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            No briefing book yet
          </h1>
          <p className="mt-3 text-muted">
            Generate the briefing book from the scorecard right after a
            completed simulation run.
          </p>
          <Link
            href={`/scorecard?session_id=${session.id}&agency=${encodeURIComponent(String(agency))}`}
            className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Back to scorecard
          </Link>
        </main>
      </>
    )
  }

  const advocacy = session.scorecard_output?.advocacy_points ?? []
  const priorities = session.scorecard_output?.priority_actions ?? []

  // Group Q&A by factor, preserving order of first appearance.
  const factors: string[] = []
  for (const item of briefing.qa) {
    if (!factors.includes(item.factor)) factors.push(item.factor)
  }

  return (
    <>
      <PageHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Briefing book — confidential
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {session.issuer_name} × {agency}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {[
                session.meeting_type,
                session.meeting_date
                  ? `meeting ${new Date(session.meeting_date).toLocaleDateString()}`
                  : null,
                `prepared ${new Date(briefing.generated_at).toLocaleDateString()}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <PrintButton />
        </header>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Suggested opening
          </h2>
          <div className="mt-3 rounded-lg border border-border bg-white p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {briefing.opening_statement}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Anticipated Q&amp;A
          </h2>
          <p className="mt-1 text-sm text-muted">
            Model answers are drafted from your narrative and session answers —
            bracketed placeholders mark facts to gather before the meeting.
          </p>
          <div className="mt-4 flex flex-col gap-6">
            {factors.map((factor) => (
              <div key={factor}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {factor}
                </h3>
                <div className="mt-2 flex flex-col gap-3">
                  {briefing.qa
                    .filter((item) => item.factor === factor)
                    .map((item, i) => (
                      <article
                        key={i}
                        className="rounded-lg border border-border bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">
                            Q: {item.question}
                          </p>
                          <span
                            className={[
                              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              item.basis === 'asked'
                                ? 'border-brand/30 bg-brand/5 text-brand'
                                : 'border-border bg-surface text-muted',
                            ].join(' ')}
                          >
                            {item.basis === 'asked'
                              ? 'asked in simulation'
                              : 'anticipated'}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {item.model_answer}
                        </p>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {advocacy.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Advocacy points to land
            </h2>
            <ul className="mt-3 space-y-2 rounded-lg border border-border bg-white p-5 text-sm leading-relaxed">
              {advocacy.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-border">—</span>
                  <span>{p.point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {priorities.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Priority prep before the meeting
            </h2>
            <ol className="mt-3 space-y-2 rounded-lg border border-border bg-white p-5 text-sm leading-relaxed">
              {priorities.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-semibold text-brand">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="mt-8 text-xs text-muted print:hidden">
          Export opens your browser&apos;s print dialog — choose &quot;Save as
          PDF&quot;.
        </p>
      </main>
    </>
  )
}
