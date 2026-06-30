'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Scene = {
  image: string
  caption: string
  /** Override the default scene duration (ms) for this scene. */
  durationMs?: number
}

const DEFAULT_DURATION_MS = 6000

const SCENES: Scene[] = [
  {
    image: '/demo/scenes/01-intake.png',
    caption:
      'Tell us about the issuer and the upcoming meeting. Thirty seconds and you are in.',
  },
  {
    image: '/demo/scenes/02-narrative.png',
    caption:
      'Paste your prepared narrative. It lives only in your browser tab — never on our servers.',
  },
  {
    image: '/demo/scenes/03-simulation-open.png',
    caption:
      'A simulated S&P, Moody’s, or Fitch analyst opens the meeting. Their tone matches the agency.',
  },
  {
    image: '/demo/scenes/04-simulation-mid.png',
    caption:
      'Factor by factor — capital, asset quality, funding, earnings, risk — answers get flagged in real time.',
  },
  {
    image: '/demo/scenes/05-scorecard-summary.png',
    caption:
      'Finish with a readiness score, weak answers, and critical gaps quantified.',
  },
  {
    image: '/demo/scenes/06-scorecard-detail.png',
    caption:
      'Factor-by-factor breakdown: what you handled well, what got flagged, and a specific action to take.',
  },
  {
    image: '/demo/scenes/07-committee-memo.png',
    caption:
      'See how the analyst would write your credit up for their internal committee.',
  },
  {
    image: '/demo/scenes/08-coach.png',
    caption:
      'Ask the AI Ratings Coach anything about your session — pulls from the transcript and proprietary advisor notes.',
  },
  {
    image: '/demo/scenes/09-dashboard.png',
    caption:
      'Track sessions over time. Run a new one whenever the next meeting comes up.',
  },
]

export function DemoPlayer() {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  // Tracks which scene images failed to load so we can render a friendly
  // placeholder until the screenshots are captured.
  const [missing, setMissing] = useState<Set<number>>(new Set())

  const scene = SCENES[idx]
  const sceneDuration = scene.durationMs ?? DEFAULT_DURATION_MS

  function goTo(nextIdx: number) {
    setIdx(Math.max(0, Math.min(SCENES.length - 1, nextIdx)))
    setElapsedMs(0)
    setDone(false)
  }

  function restart() {
    setIdx(0)
    setElapsedMs(0)
    setDone(false)
    setPlaying(true)
  }

  // Drive the scene timeline while playing.
  useEffect(() => {
    if (!playing || done) return
    const start = Date.now()
    const startElapsed = elapsedMs
    const interval = setInterval(() => {
      const cur = startElapsed + (Date.now() - start)
      if (cur >= sceneDuration) {
        if (idx + 1 >= SCENES.length) {
          setDone(true)
          setPlaying(false)
        } else {
          setIdx(idx + 1)
          setElapsedMs(0)
        }
      } else {
        setElapsedMs(cur)
      }
    }, 50)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, done, idx])

  // Keyboard nav: ←/→ to skip, space to pause, R to restart.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goTo(idx - 1)
      else if (e.key === 'ArrowRight') goTo(idx + 1)
      else if (e.key === ' ') {
        e.preventDefault()
        if (done) restart()
        else setPlaying((p) => !p)
      } else if (e.key.toLowerCase() === 'r') restart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done])

  return (
    <div className="flex flex-col gap-5">
      {/* Progress segments */}
      <ol className="flex gap-1">
        {SCENES.map((_, i) => {
          const filled =
            i < idx ? 100 : i === idx ? (elapsedMs / sceneDuration) * 100 : 0
          return (
            <li
              key={i}
              className="h-1 flex-1 overflow-hidden rounded-full bg-border"
              aria-label={`Scene ${i + 1} progress`}
            >
              <span
                className="block h-full bg-brand transition-[width]"
                style={{ width: `${filled}%` }}
              />
            </li>
          )
        })}
      </ol>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface">
        <button
          type="button"
          onClick={() => {
            if (done) restart()
            else goTo(idx + 1)
          }}
          aria-label="Next scene"
          className="block w-full"
        >
          <div className="relative aspect-[16/10] w-full">
            {missing.has(idx) ? (
              <ScenePlaceholder
                imagePath={scene.image}
                sceneNumber={idx + 1}
              />
            ) : (
              <img
                src={scene.image}
                alt={scene.caption}
                onError={() =>
                  setMissing((prev) => new Set(prev).add(idx))
                }
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
        </button>

        {done && <EndCard onRestart={restart} />}
      </div>

      {/* Caption */}
      <p className="min-h-[3rem] text-center text-lg leading-relaxed text-foreground">
        {scene.caption}
      </p>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex items-center gap-3 text-sm text-muted">
          <button
            type="button"
            onClick={() => {
              if (done) restart()
              else setPlaying((p) => !p)
            }}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {done ? 'Restart' : playing ? 'Pause' : 'Play'}
          </button>
          <span aria-live="polite">
            Scene {idx + 1} of {SCENES.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => goTo(idx + 1)}
          disabled={idx === SCENES.length - 1}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <p className="text-center text-xs text-muted">
        Press space to pause, ← → to skip, R to restart.
      </p>
    </div>
  )
}

function ScenePlaceholder({
  imagePath,
  sceneNumber,
}: {
  imagePath: string
  sceneNumber: number
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface p-8 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand">
        Scene {sceneNumber}
      </div>
      <p className="mt-3 max-w-md text-sm text-muted">
        Drop the screenshot at{' '}
        <code className="rounded bg-white px-1.5 py-0.5 text-xs text-foreground">
          {imagePath}
        </code>{' '}
        to fill this slot.
      </p>
    </div>
  )
}

function EndCard({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center">
      <div className="rounded-lg border border-border bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          That is the product
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Ready to prep your next meeting?
        </h3>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/landing#request-access"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Request access
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand"
          >
            Watch again
          </button>
        </div>
      </div>
    </div>
  )
}
