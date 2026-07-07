import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import { FeedbackForm } from './FeedbackForm'

export const metadata: Metadata = {
  title: 'The Ratings Coach — Contact us',
  description:
    'Send us feedback or get in touch with The Ratings Coach team.',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Contact
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Questions, ideas, or something not working the way you expected?
            Use the form below, or email us directly at{' '}
            <a
              href="mailto:feedback@theratingscoach.com"
              className="text-brand hover:text-brand-hover"
            >
              feedback@theratingscoach.com
            </a>
            .
          </p>
        </header>

        <div className="mt-10 rounded-lg border border-border bg-white p-6">
          <FeedbackForm />
        </div>

        <p className="mt-4 text-xs text-muted">
          We&apos;ll only use your details to respond to your note. Your
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
