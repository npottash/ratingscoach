import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — The Ratings Coach',
  description: 'The terms under which The Ratings Coach is offered.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-muted">Last updated: June 19, 2026</p>
      </header>

      <Section title="Acceptance of these terms">
        <p>
          By creating an account or otherwise using The Ratings Coach, you agree
          to be bound by these Terms of Service. If you do not agree, do not
          use the service.
        </p>
      </Section>

      <Section title="What the service is">
        <p>
          The Ratings Coach is a simulated meeting and coaching tool. It uses
          generative AI to role-play credit rating agency analyst meetings and
          to provide a structured readiness scorecard afterward. It is intended
          for professional preparation only.
        </p>
        <p>
          The Ratings Coach is{' '}
          <span className="font-medium text-foreground">not</span> a credit
          rating, not financial advice, not legal advice, and not investment
          advice. The simulated analysts are fictional personas; they do not
          represent or speak for any real rating agency or any real rating
          analyst, and nothing the simulator says should be interpreted as the
          position of S&amp;P Global, Moody&apos;s, Fitch Ratings, or any of
          their affiliates.
        </p>
      </Section>

      <Section title="Eligibility and account">
        <ul className="list-disc space-y-1.5 pl-6">
          <li>You must be at least 18 years old and authorized to act on behalf of your organization to use the service.</li>
          <li>You are responsible for the accuracy of the information you submit and for safeguarding your account credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>If you suspect unauthorized access, notify us promptly.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Use the service for any unlawful purpose or in violation of any applicable law or regulation.</li>
          <li>Attempt to gain unauthorized access to the service, any accounts, or any underlying systems.</li>
          <li>Scrape, crawl, or otherwise extract data from the service through automated means.</li>
          <li>Reverse engineer, decompile, or attempt to derive the source code or model behind the service except to the extent allowed by applicable law.</li>
          <li>Use the service to develop or train a competing AI product.</li>
          <li>Upload content that infringes any third party's rights, including intellectual property or privacy rights.</li>
          <li>Misrepresent the service's output as having come from a real rating agency or analyst.</li>
        </ul>
      </Section>

      <Section title="Your content">
        <p>
          You retain all rights in the content you submit to the service, including narratives, key topics, and any real-meeting questions you choose to log. You grant us a limited license to process that content solely as needed to operate the service for you, as described in our{' '}
          <a href="/privacy" className="text-brand hover:text-brand-hover">
            Privacy Policy
          </a>
          .
        </p>
      </Section>

      <Section title="Our intellectual property">
        <p>
          The Ratings Coach product, including the proprietary knowledge overlay, system prompts, code, branding, and user interface, is owned by us and is protected by intellectual property laws. You receive only a non-exclusive, non-transferable, revocable license to use the service in accordance with these terms.
        </p>
      </Section>

      <Section title="Fees">
        <p>
          To the extent that paid features are offered, the applicable fees and billing terms will be presented to you before charge. Unless otherwise stated, fees are non-refundable.
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
        </p>
        <p>
          We do not warrant that the service will be uninterrupted, error-free, or that any output is accurate, complete, or suitable for your particular circumstances. You are responsible for exercising professional judgment about how to use any output.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, in no event will we be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, data, or goodwill arising from or related to your use of the service, even if we have been advised of the possibility of such damages.
        </p>
        <p>
          Our aggregate liability arising from or related to the service will not exceed the greater of (a) the amount you have paid us for the service in the twelve months preceding the event giving rise to the liability, or (b) one hundred United States dollars.
        </p>
      </Section>

      <Section title="Indemnification">
        <p>
          You agree to indemnify and hold us harmless from any claims, damages, or expenses arising out of your use of the service in violation of these terms or any applicable law.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          We may suspend or terminate your access to the service at any time for any reason, including violation of these terms. You may terminate your account at any time by contacting us. Provisions that by their nature should survive termination will do so.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the State of New York, without regard to its conflict-of-laws principles. Any dispute will be brought exclusively in the courts located in New York County, New York.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may revise these terms from time to time. If we make material changes, we will notify signed-in users and update the &quot;Last updated&quot; date above. Continued use of the service after changes take effect constitutes acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email security@theratingscoach.com.
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
