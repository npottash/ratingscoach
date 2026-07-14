import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { VimeoEmbed } from '@/components/VimeoEmbed'
import { DemoPlayer } from './DemoPlayer'

export const metadata: Metadata = {
  title: 'The Ratings Coach — Watch the demo',
  description:
    'See how The Ratings Coach simulates a real rating agency meeting end to end.',
}

export default function DemoPage() {
  // Set NEXT_PUBLIC_VIMEO_DEMO_ID once your video is on Vimeo. Format:
  // - For public videos: just the numeric ID, e.g. "123456789"
  // - For unlisted videos: numeric ID + ":" + hash from share URL,
  //   e.g. "123456789:abc123def4"
  const vimeoConfig = process.env.NEXT_PUBLIC_VIMEO_DEMO_ID ?? ''
  const [videoId, hash] = vimeoConfig.split(':')
  const hasVimeoVideo = Boolean(videoId)
  const hasLocalVideo = fs.existsSync(
    path.join(process.cwd(), 'public', 'demo', 'demo.mp4')
  )

  return (
    <>
      <PageHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Product tour
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            See it in action
          </h1>
        </header>

        {hasVimeoVideo ? (
          <VimeoEmbed videoId={videoId} hash={hash || undefined} />
        ) : hasLocalVideo ? (
          <video
            src="/demo/demo.mp4"
            controls
            playsInline
            className="aspect-video w-full rounded-lg border border-border bg-black shadow-sm"
          />
        ) : (
          <DemoPlayer />
        )}

        {/* Animated "How it works" explainer */}
        <section className="flex flex-col gap-4">
          <header className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
            <p className="mx-auto mt-1 max-w-2xl text-muted">
              A one-minute animated walkthrough of a session &mdash; from
              intake, through the simulated meeting, to your scorecard and
              briefing book.
            </p>
          </header>
          <video
            src="/demo/how-it-works.mp4"
            controls
            playsInline
            className="aspect-video w-full rounded-lg border border-border bg-black shadow-sm"
          />
        </section>

        <footer className="text-center">
          <Link
            href="/landing#request-access"
            className="inline-block rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-hover"
          >
            Request access
          </Link>
        </footer>
      </main>
    </>
  )
}
