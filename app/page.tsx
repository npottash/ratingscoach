import Link from 'next/link'

const AGENCIES = ['S&P', "Moody's", 'Fitch']

const STEPS = [
  {
    n: 1,
    title: 'Intake',
    body: 'Tell us the issuer, sector, agency, and current rating. Two minutes.',
  },
  {
    n: 2,
    title: 'Rehearse',
    body: 'A simulated analyst probes your credit narrative, factor by factor.',
  },
  {
    n: 3,
    title: 'Scorecard',
    body: 'Leave with a readiness score, a committee memo, and a prep list.',
  },
]

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" aria-label="The Ratings Coach" className="flex items-center">
            {/* Wordmark uses Georgia serif — kept as inline SVG asset, not a
                next/image component, so the file stays sharp at any scale and
                no image-domain config is required. */}
            <img
              src="/wordmark-header.svg"
              alt="The Ratings Coach"
              width={240}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/login" className="text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-hover"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center sm:py-24">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Walk into your rating agency meeting prepared.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            The Ratings Coach simulates a real S&amp;P, Moody&apos;s, or Fitch analyst
            meeting and pressure-tests your credit narrative before the real one.
            Finish each session with a structured scorecard and a focused prep
            list.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-hover"
            >
              Start a session
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-border bg-white px-6 py-3 text-base font-medium text-foreground hover:border-brand hover:text-brand"
            >
              Watch the demo
            </Link>
          </div>

          {/* Credibility line */}
          <p className="mt-10 text-sm text-muted">
            Built by senior credit ratings advisors.
          </p>

          {/* Agency band */}
          <div className="mt-4 flex items-center justify-center gap-3 text-sm font-medium tracking-wide text-foreground/70">
            {AGENCIES.map((a, i) => (
              <span key={a} className="flex items-center gap-3">
                {i > 0 && (
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                )}
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-6 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">
            How it works
          </p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {step.n}
                </span>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  {step.title}
                </h2>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
