import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/PageHeader'
import { FACTORS_BY_SECTOR } from '@/lib/factors'
import { getKnowledge, type KnowledgeItem } from '@/lib/knowledge'
import type { Agency } from '@/lib/types'

const AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

// Loose keyword map for filtering corpus chunks (which are free text) by
// sector. Overlay cells and real_questions filter exactly.
const SECTOR_KEYWORDS: Record<string, string[]> = {
  Bank: ['bank', 'fig '],
  Insurance: ['insur', 'life ', 'p&c', 'reinsur'],
  'Asset Manager': ['asset manager', 'wealth', 'hedge fund', 'manco', 'aum'],
  'Non-Bank Financial Institution': [
    'nbfi',
    'bdc',
    'private credit',
    'captive',
    'leasing',
    'reit',
    'mortgage',
    'securities firm',
    'market maker',
    'exchange',
  ],
  Sovereign: ['sovereign'],
  'Corporate IG': ['corporate'],
  'Corporate HY': ['corporate', 'high yield', 'speculative'],
}

type ChunkRow = {
  id: string
  category: string
  content: string
  agency: string | null
  sector: string | null
  created_at: string | null
}

type RealQuestionRow = {
  id: string
  agency: string
  sector: string
  question_text: string
  created_at: string
}

function isAdmin(email: string | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return admin.trim().toLowerCase() === email.trim().toLowerCase()
}

function itemText(it: KnowledgeItem): string {
  return typeof it === 'string' ? it : it.text
}

function itemSubTypes(it: KnowledgeItem): string[] {
  return typeof it === 'string' ? [] : (it.sub_types ?? [])
}

function browseHref(params: { sector?: string; agency?: string }): string {
  const qs = new URLSearchParams()
  if (params.sector) qs.set('sector', params.sector)
  if (params.agency) qs.set('agency', params.agency)
  const s = qs.toString()
  return s ? `/admin/browse?${s}` : '/admin/browse'
}

export default async function AdminBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string; agency?: string }>
}) {
  const { sector: rawSector, agency: rawAgency } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/dashboard')

  const sectors = Object.keys(FACTORS_BY_SECTOR)
  const sector = sectors.includes(rawSector ?? '') ? rawSector! : null
  const agency = AGENCIES.includes(rawAgency as Agency)
    ? (rawAgency as Agency)
    : null

  const shownSectors = sector ? [sector] : sectors
  const shownAgencies = agency ? [agency] : AGENCIES

  // ── Corpus + real questions via service role (RLS blocks cookie reads) ──
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const [{ data: chunksRaw }, { data: realQsRaw }] = await Promise.all([
    admin
      .from('knowledge_base')
      .select('id, category, content, agency, sector, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('real_questions')
      .select('id, agency, sector, question_text, created_at')
      .order('created_at', { ascending: false }),
  ])
  const allChunks: ChunkRow[] = chunksRaw ?? []
  const allRealQs: RealQuestionRow[] = realQsRaw ?? []

  const keywords = sector ? (SECTOR_KEYWORDS[sector] ?? []) : []
  const chunks = allChunks.filter((c) => {
    if (agency) {
      const a = agency.replace("'", '')
      const inText = c.content.toLowerCase().includes(a.toLowerCase().slice(0, 5))
      if (!(c.agency === agency || inText)) return false
    }
    if (sector) {
      if (c.sector === sector) return true
      const lc = c.content.toLowerCase()
      return keywords.some((k) => lc.includes(k))
    }
    return true
  })

  const realQs = allRealQs.filter(
    (q) => (!sector || q.sector === sector) && (!agency || q.agency === agency)
  )

  return (
    <>
      <PageHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Knowledge browser
          </h1>
          <p className="mt-1 text-sm text-muted">
            Overlay cells, RAG corpus chunks, and user-logged real questions —
            filter to spot coverage gaps.
          </p>
        </header>

        {/* Filters */}
        <section className="mt-6 flex flex-col gap-3">
          <FilterRow
            label="Sector"
            options={sectors}
            active={sector}
            hrefFor={(v) => browseHref({ sector: v ?? undefined, agency: agency ?? undefined })}
          />
          <FilterRow
            label="Agency"
            options={AGENCIES}
            active={agency}
            hrefFor={(v) => browseHref({ sector: sector ?? undefined, agency: v ?? undefined })}
          />
        </section>

        {/* Overlay coverage matrix */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Overlay coverage
          </h2>
          <p className="mt-1 text-sm text-muted">
            Item counts per sector × factor × agency cell (questions /
            pitfalls / markers / intel). Empty cells are the gaps.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Sector · Factor</th>
                  {shownAgencies.map((a) => (
                    <th key={a} className="px-4 py-3 text-center">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shownSectors.flatMap((s) =>
                  FACTORS_BY_SECTOR[s as keyof typeof FACTORS_BY_SECTOR].map(
                    (factor) => (
                      <tr key={`${s}|${factor}`}>
                        <td className="px-4 py-2">
                          <span className="text-muted">{s}</span>{' '}
                          <span className="font-medium">{factor}</span>
                        </td>
                        {shownAgencies.map((a) => {
                          const cell = getKnowledge(a, s, factor)
                          const q = cell?.real_questions.length ?? 0
                          const p = cell?.common_pitfalls.length ?? 0
                          const m = cell?.strong_answer_markers.length ?? 0
                          const i = cell?.agency_intel.length ?? 0
                          const total = q + p + m + i
                          return (
                            <td key={a} className="px-4 py-2 text-center">
                              <span
                                className={[
                                  'inline-flex min-w-[88px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium',
                                  total === 0
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : total < 5
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                ].join(' ')}
                                title="questions / pitfalls / markers / intel"
                              >
                                {total === 0 ? 'empty' : `${q} / ${p} / ${m} / ${i}`}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Overlay contents (needs a sector filter to stay readable) */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Overlay contents
          </h2>
          {!sector ? (
            <p className="mt-1 text-sm text-muted">
              Pick a sector filter above to list cell contents.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-6">
              {FACTORS_BY_SECTOR[
                sector as keyof typeof FACTORS_BY_SECTOR
              ].map((factor) => (
                <div
                  key={factor}
                  className="rounded-lg border border-border bg-white p-5"
                >
                  <h3 className="font-semibold">{factor}</h3>
                  {shownAgencies.map((a) => {
                    const cell = getKnowledge(a, sector, factor)
                    if (!cell) return null
                    const sections: Array<[string, KnowledgeItem[]]> = [
                      ['Real questions', cell.real_questions],
                      ['Common pitfalls', cell.common_pitfalls],
                      ['Strong-answer markers', cell.strong_answer_markers],
                      ['Agency intel', cell.agency_intel],
                    ]
                    const total = sections.reduce(
                      (n, [, items]) => n + items.length,
                      0
                    )
                    return (
                      <div key={a} className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                          {a}{' '}
                          {total === 0 && (
                            <span className="font-normal normal-case text-red-600">
                              — empty
                            </span>
                          )}
                        </p>
                        {sections.map(([name, items]) =>
                          items.length === 0 ? null : (
                            <div key={name} className="mt-2">
                              <p className="text-xs font-medium text-muted">
                                {name} ({items.length})
                              </p>
                              <ul className="mt-1 space-y-1">
                                {items.map((it, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm leading-relaxed text-foreground"
                                  >
                                    <span className="text-border">— </span>
                                    {itemText(it)}
                                    {itemSubTypes(it).map((st) => (
                                      <span
                                        key={st}
                                        className="ml-1.5 inline-flex items-center rounded-full border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted"
                                      >
                                        {st}
                                      </span>
                                    ))}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Corpus chunks */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            RAG corpus ({chunks.length}
            {chunks.length !== allChunks.length
              ? ` of ${allChunks.length}`
              : ''}{' '}
            chunks)
          </h2>
          <p className="mt-1 text-sm text-muted">
            Sector/agency filters match chunk text loosely — corpus chunks
            carry no structured sector column when ingested from files.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
            <ul className="divide-y divide-border">
              {chunks.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <p className="text-xs text-muted">{c.category}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                    {c.content.length > 320
                      ? `${c.content.slice(0, 320)}…`
                      : c.content}
                  </p>
                </li>
              ))}
              {chunks.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted">
                  No chunks match the current filters.
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* User-logged real questions */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Logged real questions ({realQs.length})
          </h2>
          <p className="mt-1 text-sm text-muted">
            User-logged debrief questions (per-user calibration data). Review
            here, distill themes, ship as STREAM/OVERLAY — never pooled
            automatically.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
            <ul className="divide-y divide-border">
              {realQs.map((q) => (
                <li key={q.id} className="px-5 py-3">
                  <p className="text-xs text-muted">
                    {q.agency} · {q.sector} ·{' '}
                    {new Date(q.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    {q.question_text}
                  </p>
                </li>
              ))}
              {realQs.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted">
                  No logged questions match the current filters.
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </>
  )
}

function FilterRow({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string
  options: readonly string[]
  active: string | null
  hrefFor: (value: string | null) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <Link
        href={hrefFor(null)}
        className={[
          'rounded-full border px-3 py-1 text-xs font-medium',
          active === null
            ? 'border-brand bg-brand text-white'
            : 'border-border bg-white text-foreground hover:border-brand hover:text-brand',
        ].join(' ')}
      >
        All
      </Link>
      {options.map((o) => (
        <Link
          key={o}
          href={hrefFor(o)}
          className={[
            'rounded-full border px-3 py-1 text-xs font-medium',
            active === o
              ? 'border-brand bg-brand text-white'
              : 'border-border bg-white text-foreground hover:border-brand hover:text-brand',
          ].join(' ')}
        >
          {o}
        </Link>
      ))}
    </div>
  )
}
