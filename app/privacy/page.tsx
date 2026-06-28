import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — The Ratings Coach',
  description:
    'How The Ratings Coach collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-muted">Last updated: June 19, 2026</p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5 text-sm">
        <p className="font-medium text-foreground">In short</p>
        <ul className="mt-2 space-y-1.5 text-muted">
          <li>
            We store your account, your session metadata, and any real-meeting
            questions you choose to log.
          </li>
          <li>
            We do <span className="font-medium text-foreground">not</span> store
            your prepared narrative, your simulation transcript, or any
            financial inputs you provide during a session — those live only in
            your browser for the duration of the session and are discarded when
            you navigate away.
          </li>
          <li>
            See our{' '}
            <Link
              href="/security"
              className="text-brand hover:text-brand-hover"
            >
              Security
            </Link>{' '}
            page for the architecture behind this.
          </li>
        </ul>
      </section>

      <Section title="Who we are">
        <p>
          The Ratings Coach is a rating prep coaching tool for CFOs, treasurers,
          and IR professionals preparing for credit rating agency meetings. In
          this policy, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; refer
          to the operators of The Ratings Coach.
        </p>
      </Section>

      <Section title="Information we collect">
        <p>
          We collect only what we need to operate the service and make your
          sessions useful over time.
        </p>
        <Subsection title="Account information">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              Your email address and a securely hashed password (handled by our
              authentication provider, Supabase).
            </li>
            <li>
              Account metadata such as creation date and last sign-in time.
            </li>
          </ul>
        </Subsection>
        <Subsection title="Session metadata">
          <p>For each prep session you create, we store:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              The issuer name, ticker, sector, sub-type, current rating,
              outlook, agency or agencies, meeting date, and meeting type you
              enter on the intake screen.
            </li>
            <li>
              Optional notes you enter in the &quot;key topics&quot; field.
            </li>
            <li>
              The summary results of a completed simulation: an overall
              readiness score, the count of factors flagged, the count of
              critical gaps, and the session status.
            </li>
          </ul>
        </Subsection>
        <Subsection title="Real-meeting questions (optional)">
          <p>
            If you choose to log the questions an analyst actually asked in a
            real meeting (via the &quot;After your real meeting&quot; field on
            the scorecard), we store those questions associated with your
            account so future simulations can learn from them.
          </p>
        </Subsection>
      </Section>

      <Section title="Information we do not collect or retain">
        <p>
          The following content is treated as ephemeral and never written to our
          databases:
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            Your prepared narrative or credit story (it lives only in your
            browser tab).
          </li>
          <li>
            The conversation between you and the simulated analyst during a
            simulation.
          </li>
          <li>
            Any specific financial inputs you mention while answering
            simulation questions.
          </li>
        </ul>
        <p>
          The model that powers the simulation receives this content only for
          the duration of the request that uses it; we do not log or store the
          request bodies. See{' '}
          <Link href="/security" className="text-brand hover:text-brand-hover">
            Security
          </Link>{' '}
          for the full data flow.
        </p>
      </Section>

      <Section title="How we use information">
        <ul className="list-disc space-y-1.5 pl-6">
          <li>To provide, maintain, and improve the service.</li>
          <li>
            To authenticate you and protect against unauthorized access to your
            account.
          </li>
          <li>
            To calibrate future simulations to your past sessions (using only
            the session metadata and real-meeting questions you logged).
          </li>
          <li>
            To respond to support requests and to comply with legal
            obligations.
          </li>
        </ul>
      </Section>

      <Section title="Third-party processors">
        <p>We rely on a small number of vendors to operate the service:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <span className="font-medium text-foreground">Supabase</span> —
            authentication and database hosting. Row-level security policies
            scope every record to its owning user.
          </li>
          <li>
            <span className="font-medium text-foreground">Anthropic</span> — the
            language model used by the simulator and scorecard. Anthropic
            processes your simulation inputs only for the duration of each
            request and does not retain them for training in our configuration.
          </li>
          <li>
            <span className="font-medium text-foreground">OpenAI</span> — used
            only for text embeddings to power semantic search across your own
            saved notes. We send short text snippets and receive numeric
            vectors back.
          </li>
          <li>
            <span className="font-medium text-foreground">Vercel</span> —
            hosting of the web application.
          </li>
        </ul>
        <p>
          We do not sell your information to third parties or share it for
          advertising purposes.
        </p>
      </Section>

      <Section title="Cookies and browser storage">
        <p>
          We use session cookies to keep you signed in. We also use your
          browser&apos;s session storage for the duration of a single tab to
          hold your narrative, simulation transcript, and detailed results so
          that the next screen can render them without persisting them to our
          servers. Closing the tab or navigating away clears this storage.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can request access to, correction of, or deletion of the data
          associated with your account at any time. Contact us at the address
          below.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p>
          The Ratings Coach is intended for use by adults in a professional
          context. We do not knowingly collect information from anyone under
          18.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. If we make material
          changes, we will notify signed-in users and update the &quot;Last
          updated&quot; date above.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or our data practices? Email
          security@theratingscoach.com.
        </p>
      </Section>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  )
}

function Subsection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-3 space-y-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
