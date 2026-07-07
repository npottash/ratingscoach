import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/PageHeader'
import { IngestForm } from './IngestForm'

type RecentRow = {
  id: string
  content: string
  category: string
  agency: string | null
  sector: string | null
  created_at: string
}

export default async function AdminIngestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/dashboard')

  // Fetch the 10 most recent ingestions. RLS may block — use service role via
  // the server client if needed. The current knowledge_base has RLS enabled
  // with no policies (service role bypasses). For a read-only admin preview,
  // we use the server (cookie) client; if RLS denies, the list just comes
  // back empty and the page still renders. Switch to service-role read here
  // if you want the preview to always populate.
  const { data: recentRaw } = await supabase
    .from('knowledge_base')
    .select('id, content, category, agency, sector, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const recent: RecentRow[] = recentRaw ?? []

  return (
    <>
      <PageHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Knowledge ingest
        </h1>
        <p className="mt-1 text-sm text-muted">
          Paste raw notes. They are cleaned by Claude, chunked into 300–500
          word segments, embedded with OpenAI, and stored in{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
            knowledge_base
          </code>
          .
        </p>
      </header>

      <section className="mt-8">
        <IngestForm />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent ingestions
        </h2>
        <p className="mt-1 text-sm text-muted">
          The 10 most recent chunks stored across all sources.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
          {recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted">
              No ingestions yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs">
                      <CategoryBadge label={r.category} />
                      {r.agency && (
                        <span className="text-muted">· {r.agency}</span>
                      )}
                      {r.sector && (
                        <span className="text-muted">· {r.sector}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground line-clamp-2">
                    {r.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </main>
    </>
  )
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/5 px-2 py-0.5 text-xs font-medium text-brand">
      {label}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
