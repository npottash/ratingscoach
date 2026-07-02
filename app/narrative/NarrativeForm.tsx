'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { Agency } from '@/lib/types'
import { ACCEPTED_EXTENSIONS, extractTextFromFile } from '@/lib/extractText'

export type SessionSummary = {
  id: string
  issuer_name: string
  agency: Agency[]
  meeting_date: string
  key_topics: string | null
}

const TIPS = [
  'Lead with the credit thesis in 2-3 sentences before drilling in.',
  'Acknowledge weaknesses head-on — credibility comes from honesty.',
  'Tie metrics to forward trajectory, not just current snapshots.',
  'Have a clear answer ready for whatever triggered this meeting.',
]

export function NarrativeForm({ session }: { session: SessionSummary }) {
  const router = useRouter()
  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploadError(null)
    setExtracting(true)
    try {
      // Extraction happens entirely in the browser — the file is never
      // uploaded to a server (see /security).
      const extracted = await extractTextFromFile(file)
      setText(extracted)
      setUploadedName(file.name)
      setTab('paste')
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not read that file.'
      )
    } finally {
      setExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const focusAreas = (session.key_topics ?? '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const meetingDate = new Date(session.meeting_date).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric' }
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    // Privacy: narrative is held in sessionStorage (client-only, never written to
    // Supabase). The /simulation page reads it into React state and sends it to
    // /api/simulate only for the duration of the active tab.
    sessionStorage.setItem(`narrative:${session.id}`, text)
    router.push(`/simulation?session_id=${session.id}`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Your credit narrative
        </h1>
        <p className="mt-2 text-muted">
          Provide the story you intend to walk through. The simulated analyst
          will probe it.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2 border-b border-border">
            <TabButton active={tab === 'paste'} onClick={() => setTab('paste')}>
              Paste text
            </TabButton>
            <TabButton
              active={tab === 'upload'}
              onClick={() => setTab('upload')}
            >
              Upload file
            </TabButton>
          </div>

          {tab === 'paste' ? (
            <>
              {uploadedName && (
                <p className="text-xs text-muted">
                  Loaded from <span className="font-medium">{uploadedName}</span>{' '}
                  — review and edit below.
                </p>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={18}
                placeholder="Paste your prepared narrative, talking points, and key messaging..."
                className="rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                required
              />
            </>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={[
                'flex h-96 cursor-pointer items-center justify-center rounded-md border-2 border-dashed text-center transition',
                dragging
                  ? 'border-brand bg-brand/5'
                  : 'border-border bg-surface hover:border-brand',
              ].join(' ')}
            >
              <div className="px-6">
                <p className="font-medium text-foreground">
                  {extracting
                    ? 'Reading your document…'
                    : dragging
                      ? 'Drop to load your narrative'
                      : 'Drag and drop a file, or click to browse'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  PDF, DOCX, or TXT. Read entirely in your browser — the file
                  is never uploaded.
                </p>
                {uploadError && (
                  <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
            </div>
          )}

          <p className="text-xs text-muted">
            Your narrative is held only in this browser tab. It is not stored
            or logged.
          </p>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || extracting || !text.trim()}
              className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {submitting ? 'Loading simulation…' : 'Start simulation'}
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Session
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Issuer</dt>
                <dd className="font-medium">{session.issuer_name}</dd>
              </div>
              <div>
                <dt className="text-muted">Agency</dt>
                <dd className="font-medium">{session.agency.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-muted">Meeting</dt>
                <dd className="font-medium">{meetingDate}</dd>
              </div>
            </dl>
          </section>

          {focusAreas.length > 0 && (
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Focus areas
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Strong narratives
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-brand text-foreground'
          : 'border-transparent text-muted hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
