'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { Agency } from '@/lib/types'
import { ACCEPTED_EXTENSIONS, extractTextFromFile } from '@/lib/extractText'
import {
  AgencyFitPanel,
  type AgencyFitRequest,
} from '@/components/AgencyFitPanel'
import { ProcessGuide } from '@/components/ProcessGuide'
import { switchAgency } from './actions'

export type SessionSummary = {
  id: string
  issuer_name: string
  ticker: string | null
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  meeting_date: string | null
  meeting_type: string | null
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
  const [fitRequest, setFitRequest] = useState<AgencyFitRequest | null>(null)
  const [fitError, setFitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openAgencyFit() {
    setFitError(null)
    setFitRequest({
      context: {
        issuer_name: session.issuer_name,
        sector: session.sector,
        industry: session.industry,
        sub_type: session.sub_type,
        current_rating: session.current_rating,
        outlook: session.outlook,
        ticker: session.ticker,
        meeting_type: session.meeting_type,
      },
      narrative: text,
      current_agency: session.agency[0],
    })
  }

  async function handleAgencySwitch(agency: Agency) {
    const { error } = await switchAgency(session.id, agency)
    if (error) {
      setFitError(error)
      throw new Error(error)
    }
    // Re-render the server component so the session panel shows the new agency.
    router.refresh()
  }

  async function extractPdfViaApi(file: File): Promise<string> {
    const buf = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_base64: btoa(binary), filename: file.name }),
    })
    const data = (await res.json()) as { text?: string; error?: string }
    if (!res.ok || !data.text) {
      throw new Error(data.error ?? 'Document extraction failed.')
    }
    return data.text
  }

  async function handleFile(file: File) {
    setUploadError(null)
    setExtracting(true)
    try {
      let extracted: string
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // PDFs go through AI transcription so tables keep their structure and
        // charts are captured with their data. Processed in memory only —
        // never stored. Falls back to local text extraction if that fails.
        try {
          extracted = await extractPdfViaApi(file)
        } catch (apiErr) {
          const local = await extractTextFromFile(file).catch(() => null)
          if (local) {
            extracted = local
            setUploadError(
              'AI transcription failed — used basic text extraction instead. Tables and charts may be incomplete. ' +
                (apiErr instanceof Error ? apiErr.message : '')
            )
          } else {
            throw apiErr
          }
        }
      } else {
        // DOCX and text files are read entirely in the browser.
        extracted = await extractTextFromFile(file)
      }
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

  const meetingDate = session.meeting_date
    ? new Date(session.meeting_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

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

      {session.meeting_type === 'New Rating Request' && (
        <Link
          href={`/narrative/builder?session_id=${session.id}`}
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/5 px-5 py-4 transition hover:border-brand"
        >
          <span>
            <span className="block text-sm font-semibold text-foreground">
              First agency meeting? Most debut issuers start here.
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              No prepared story yet — build one factor by factor with guided
              prompts tailored to your sector and agency.
            </span>
          </span>
          <span className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
            Build it with me →
          </span>
        </Link>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-border">
            <TabButton active={tab === 'paste'} onClick={() => setTab('paste')}>
              Paste text
            </TabButton>
            <TabButton
              active={tab === 'upload'}
              onClick={() => setTab('upload')}
            >
              Upload file
            </TabButton>
            {session.meeting_type !== 'New Rating Request' && (
              <Link
                href={`/narrative/builder?session_id=${session.id}`}
                className="ml-auto pb-2 text-sm font-medium text-brand hover:text-brand-hover"
              >
                No story yet? Build it with me →
              </Link>
            )}
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
                  PDF, DOCX, or TXT. PDFs are transcribed by AI so tables and
                  charts are preserved — processed in memory, never stored.
                  DOCX and TXT are read entirely in your browser.
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

          {session.meeting_type === 'New Rating Request' && (
            <ProcessGuide
              sessionId={session.id}
              meetingDate={session.meeting_date}
            />
          )}

          {session.meeting_type === 'New Rating Request' && (
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Agency fit
              </h2>
              <p className="mt-2 text-sm text-muted">
                Once your story is in, check which agency&apos;s approach fits
                it best — and switch before you simulate.
              </p>
              <button
                type="button"
                onClick={openAgencyFit}
                disabled={!text.trim()}
                className="mt-3 w-full rounded-md border border-brand/40 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                Check agency fit against your story
              </button>
              {!text.trim() && (
                <p className="mt-1.5 text-xs text-muted">
                  Add your narrative first.
                </p>
              )}
              {fitError && (
                <p className="mt-1.5 text-xs text-red-600">{fitError}</p>
              )}
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

      {fitRequest && (
        <AgencyFitPanel
          request={fitRequest}
          currentAgency={session.agency[0]}
          pickLabel={(a) => `Switch to ${a}`}
          onPick={handleAgencySwitch}
          onClose={() => setFitRequest(null)}
        />
      )}
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
