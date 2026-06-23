import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            The Ratings Coach
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

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Walk into your rating agency meeting prepared.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            The Ratings Coach simulates a real S&amp;P, Moody&apos;s, or Fitch analyst
            meeting and pressure-tests your credit narrative before the real one.
            Finish each session with a structured scorecard and a focused prep
            list.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/signup"
              className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-hover"
            >
              Start a session
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
