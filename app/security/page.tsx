import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'How The Ratings Coach Protects Your Information',
  description:
    'How The Ratings Coach handles your data: zero-retention by architecture, encrypted in transit, never used for training.',
}

export default function SecurityPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-10 px-6 py-14">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Security
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          How The Ratings Coach Protects Your Information
        </h1>
        <p className="text-sm text-muted">Last updated: June 2026</p>
      </header>

      <Callout variant="brand" eyebrow="The short version">
        <p>
          When you use The Ratings Coach your narrative, financial projections,
          and management talking points are never stored anywhere. They are
          processed in real time to generate your simulation and then
          permanently discarded. We cannot retrieve them. Nobody at The Ratings
          Coach can read them. They do not exist after your session ends.
        </p>
        <p>
          This is not a policy decision that could be changed by an employee or
          overridden by a court order. It is an architectural decision — we
          built the product so that storing your content is technically
          impossible.
        </p>
      </Callout>

      <Section title="Why we built it this way">
        <p>
          We built The Ratings Coach for CFOs, treasurers, and IR professionals
          preparing for credit rating agency meetings. We understand that the
          information you bring to those meetings — earnings trajectories,
          capital plans, strategic initiatives, responses to agency concerns —
          is among the most sensitive information your company produces.
        </p>
        <p>
          We made a deliberate decision at the start: we would never be in a
          position where we held your sensitive information. Not because we
          don&apos;t trust our own security, but because the safest data is
          data that was never collected in the first place.
        </p>
      </Section>

      <Section title="Exactly what happens when you use The Ratings Coach">
        <Step number={1} title="You fill out the intake form">
          <p>
            You enter basic session information: your company name, sector,
            current rating, agency you are prepping for, and meeting date. This
            information is saved to your account so your dashboard works and
            you can track your sessions over time.
          </p>
        </Step>

        <Step number={2} title="You paste your narrative">
          <p>
            You paste your prepared talking points, management presentation, or
            key messages into the narrative field. At this moment, your content
            exists only in your browser. It has not been sent anywhere yet.
          </p>
        </Step>

        <Step number={3} title="You start the simulation">
          <p>
            When you click Start Simulation, your narrative is transmitted
            directly from your browser to the AI model that powers the
            simulation. It travels over an encrypted connection (HTTPS). It is
            not written to any database, log file, cache, or storage system at
            any point during this transmission.
          </p>
        </Step>

        <Step number={4} title="The simulation runs">
          <p>
            The AI model reads your narrative, generates analyst questions, and
            returns them to your browser. Your narrative and the conversation
            that follows exist only in your browser&apos;s active memory during
            this process. If you refresh the page, close your browser, or lose
            your internet connection, the content is gone.
          </p>
        </Step>

        <Step number={5} title="Your session ends">
          <p>
            When you complete the simulation or close your browser, your
            narrative and conversation transcript cease to exist anywhere. What
            gets saved to your account is only your score, the number of flags
            raised by factor, and your meeting date. No content. No transcript.
            No narrative text.
          </p>
        </Step>
      </Section>

      <Section title="What we store and what we do not store">
        <h3 className="text-base font-semibold text-foreground">We store</h3>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Your email address and encrypted password</li>
          <li>
            Session metadata: company name, agency, meeting date, overall
            readiness score, factor scores
          </li>
          <li>Your account preferences</li>
        </ul>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          We never store
        </h3>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Your narrative text or management talking points</li>
          <li>
            Financial projections, earnings guidance, or capital plans
          </li>
          <li>Simulation conversation transcripts</li>
          <li>Your answers to analyst questions</li>
          <li>
            Any content you type into the narrative or simulation fields
          </li>
        </ul>
      </Section>

      <Section title="The AI layer — Anthropic">
        <p>
          The simulation is powered by Claude, an AI model built by Anthropic.
          When your narrative is transmitted to the AI model, it goes through
          Anthropic&apos;s API.
        </p>
        <p>
          Two things you should know about Anthropic&apos;s data handling:
        </p>
        <p>
          First, Anthropic&apos;s API terms explicitly state that content
          submitted through the API is not used to train their AI models. Your
          narrative does not make the AI smarter or inform future versions of
          the product.
        </p>
        <p>
          Second, Anthropic maintains enterprise-grade security infrastructure.
          Their systems are SOC 2 Type II compliant. You can review
          Anthropic&apos;s privacy policy and security documentation at{' '}
          <a
            href="https://www.anthropic.com"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:text-brand-hover"
          >
            anthropic.com
          </a>
          .
        </p>
        <p>
          We have selected Anthropic as our AI provider specifically because of
          their commitment to data privacy and their enterprise-grade security
          posture.
        </p>
      </Section>

      <Section title="Encryption and transmission security">
        <p>
          All data transmitted between your browser and The Ratings Coach is
          encrypted using TLS 1.3, the current industry standard for secure
          internet communication. This is the same encryption standard used by
          major financial institutions and healthcare providers.
        </p>
        <p>
          Your login credentials are never stored in plain text. Passwords are
          hashed using bcrypt before storage. The Ratings Coach employees
          cannot see your password.
        </p>
      </Section>

      <Section title="Our infrastructure">
        <p>
          The Ratings Coach is hosted on Vercel, a SOC 2 Type II certified
          cloud infrastructure provider used by thousands of enterprise
          companies. Our database is hosted on Supabase, which runs on AWS
          infrastructure and maintains SOC 2 Type II certification.
        </p>
        <p>
          Session metadata stored in our database is protected by row-level
          security — meaning each user can only ever access their own data.
          Our employees do not have routine access to production data.
        </p>
      </Section>

      <Section title="Regulation FD and securities law">
        <p>
          The Ratings Coach is not a registered investment adviser,
          broker-dealer, or financial institution. We do not provide investment
          advice.
        </p>
        <p>
          We are aware that CFOs and IR professionals at public companies
          operate under Regulation FD and other securities disclosure
          obligations. Because The Ratings Coach does not store your content
          and does not share your information with any third party, using The
          Ratings Coach does not constitute a public disclosure under
          Regulation FD.
        </p>
        <p>
          We recommend that users consult with their general counsel regarding
          their company&apos;s specific policies around third-party software
          and information sharing. We are happy to provide technical
          documentation about our zero-retention architecture to support that
          review.
        </p>
      </Section>

      <Callout variant="brand" eyebrow="What we cannot do with your information">
        <p>To be explicit:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            We cannot read your narrative or simulation transcript because we
            do not store it
          </li>
          <li>
            We cannot share your content with rating agencies, regulators, or
            any third party because we do not have it
          </li>
          <li>
            We cannot produce your content in response to a subpoena or legal
            order because it does not exist in our systems
          </li>
          <li>
            We cannot use your content to train AI models or improve our
            product because we never collected it
          </li>
        </ul>
      </Callout>

      <Section title="Independent verification">
        <p>
          We welcome scrutiny of our security architecture. If your
          organization requires a security review, vendor assessment, or
          technical documentation of our zero-retention architecture as part of
          a procurement process, please contact us. We will provide:
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            A technical architecture diagram showing the data flow and where
            content is and is not persisted
          </li>
          <li>Our Privacy Policy and Terms of Service</li>
          <li>
            A Data Processing Agreement (DPA) for enterprise clients who
            require one
          </li>
          <li>
            References from existing clients who have completed a security
            review
          </li>
        </ul>
      </Section>

      <Section title="Questions">
        <p>
          If you have questions about how The Ratings Coach handles your
          information that are not answered here, please contact us at
          security@theratingscoach.com. We will respond within one business
          day.
        </p>
        <p>
          If your organization requires a vendor security questionnaire, send
          it to the same address. We complete these promptly and thoroughly.
        </p>
      </Section>

      <p className="text-base italic leading-relaxed text-foreground">
        The Ratings Coach is committed to being the most trusted tool in the
        ratings preparation market. We believe that trust is built through
        transparency, not just policy. If something on this page is unclear or
        you want to understand our architecture in more detail, ask us. We
        will explain it.
      </p>
      </main>
    </>
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
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-foreground">
        <span className="text-muted">Step {number} — </span>
        {title}
      </h3>
      <div className="space-y-3 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  )
}

function Callout({
  eyebrow,
  variant = 'surface',
  children,
}: {
  eyebrow: string
  variant?: 'surface' | 'brand'
  children: React.ReactNode
}) {
  const styles =
    variant === 'brand'
      ? 'border-brand/30 bg-brand/5'
      : 'border-border bg-surface'
  return (
    <aside
      className={[
        'rounded-lg border p-6 text-base leading-relaxed text-foreground',
        styles,
      ].join(' ')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        {eyebrow}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
    </aside>
  )
}
