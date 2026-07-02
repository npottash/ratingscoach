import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { WaitlistForm } from './WaitlistForm'

export const metadata: Metadata = {
  title: 'The Ratings Coach — Request access',
  description:
    'Prepare for your next rating agency meeting like you have an insider in the room. Built for CFOs, treasurers, and IR professionals.',
}

export default function LandingPage() {
  return (
    <>
      <PageHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Benefits />
        <PrivacyCallout />
        <RequestAccess />
      </main>
    </>
  )
}

/* ------------------------------------------------------------------------- */
/* Sections                                                                  */
/* ------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          For CFOs, treasurers, and IR professionals
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Prepare for your next agency meeting like you have an insider in the
          room.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          The Ratings Coach simulates a real S&amp;P, Moody&apos;s, or Fitch
          analyst meeting using proprietary insights from senior credit
          advisors. Walk in prepared with a readiness scorecard, a committee
          memo, and the exact questions you will be asked.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="#request-access"
            className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-hover"
          >
            Request access
          </Link>
          <Link
            href="/demo"
            className="rounded-md border border-border bg-white px-6 py-3 text-base font-medium text-foreground hover:border-brand hover:text-brand"
          >
            Watch the 60-second demo
          </Link>
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          What you get
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          A repeatable way to prep
        </h2>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <BenefitCard
          eyebrow="Simulation"
          title="Practice the questions you will actually be asked"
          description="A rotating analyst persona for each of S&P, Moody's, and Fitch probes your credit story factor by factor — using the questions advisors have heard in real meetings."
        />
        <BenefitCard
          eyebrow="Scorecard"
          title="See your readiness score before the analyst does"
          description="Factor-by-factor breakdown with flagged answers, specific weak points, and three prioritized actions to take before the real meeting."
        />
        <BenefitCard
          eyebrow="Committee memo"
          title="Read the credit through the analyst's eyes"
          description="A draft committee memo written in the analyst's voice — so you know what they will tell their internal committee about your credit."
        />
      </div>
    </section>
  )
}

function PrivacyCallout() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Built for sensitive information
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Your narrative is never stored. Zero data retention.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
          Your prepared narrative and simulation transcript exist only in your
          browser for the length of a session and are discarded when you close
          the tab. Read the architecture details on our{' '}
          <Link
            href="/security"
            className="text-brand hover:text-brand-hover"
          >
            Security
          </Link>{' '}
          page.
        </p>
      </div>
    </section>
  )
}

function RequestAccess() {
  return (
    <section
      id="request-access"
      className="scroll-mt-12 px-6 py-20"
    >
      <div className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Limited rollout
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Request access
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted">
          We are rolling out to a small group of firms first. Drop your email
          and we will be in touch when there is a seat for you.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <WaitlistForm />
        </div>
      </div>
    </section>
  )
}

function BenefitCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
    </article>
  )
}
