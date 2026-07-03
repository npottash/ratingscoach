import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import { AdvisoryForm } from './AdvisoryForm'

export const metadata: Metadata = {
  title: 'The Ratings Coach — Book an advisory session',
  description:
    'Work one-on-one with a senior credit ratings advisor to prepare for your agency meeting.',
}

const VALUE_POINTS = [
  'A senior advisor reviews your prepared narrative and simulation results.',
  'Agency-specific coaching for S&P, Moody’s, or Fitch — methodology, likely pushback, and framing.',
  'A tailored prep plan for the weeks leading into the meeting.',
]

export default function AdvisoryPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Advisory
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Book an advisory session
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            The simulator gets you reps. For the meetings that matter most, work
            directly with a senior credit ratings advisor who has sat on the
            other side of the table.
          </p>
        </header>

        <ul className="mt-8 flex flex-col gap-3">
          {VALUE_POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-foreground">
              <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-lg border border-border bg-white p-6">
          <AdvisoryForm />
        </div>

        <p className="mt-4 text-xs text-muted">
          We&apos;ll only use your details to arrange the session. Your
          simulation narrative and transcript are never attached — see our{' '}
          <a href="/security" className="text-brand hover:text-brand-hover">
            security page
          </a>
          .
        </p>
      </main>
    </>
  )
}
