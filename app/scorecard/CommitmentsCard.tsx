'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agency } from '@/lib/types'

type CommitmentKind = 'qualitative' | 'quantitative'

type Commitment = {
  id: string
  commitment_text: string
  status: string
  kind: CommitmentKind
  created_at: string
}

const KIND_META: Record<
  CommitmentKind,
  { label: string; hint: string; placeholder: string }
> = {
  quantitative: {
    label: 'Quantitative',
    hint: 'Targets, thresholds, and ratios',
    placeholder: 'e.g. Buybacks pause if CET1 falls below 12.5%…',
  },
  qualitative: {
    label: 'Qualitative',
    hint: 'Actions, policies, and disclosures',
    placeholder: 'e.g. Provide advance notice before any capital action outside the framework…',
  },
}

/**
 * Track what management has committed to with the agency, split into
 * quantitative and qualitative commitments. Analysts remember and check —
 * open commitments are probed in future simulations for this issuer × agency.
 */
export function CommitmentsCard({
  issuerName,
  agency,
}: {
  issuerName: string
  agency: Agency
}) {
  const [items, setItems] = useState<Commitment[]>([])
  const [drafts, setDrafts] = useState<Record<CommitmentKind, string>>({
    quantitative: '',
    qualitative: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('commitments')
          .select('*')
          .eq('issuer_name', issuerName)
          .eq('agency', agency)
          .order('created_at', { ascending: false })
        setItems(
          ((data ?? []) as Array<Commitment & { kind?: string }>).map((c) => ({
            ...c,
            kind: c.kind === 'quantitative' ? 'quantitative' : 'qualitative',
          }))
        )
      } catch {
        // Table may not exist yet — the card still renders for input.
      } finally {
        setLoaded(true)
      }
    })()
  }, [issuerName, agency])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const rows: Array<{ kind: CommitmentKind; text: string }> = (
      ['quantitative', 'qualitative'] as const
    ).flatMap((kind) =>
      drafts[kind]
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text) => ({ kind, text }))
    )
    if (rows.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in.')
      const { data, error: insErr } = await supabase
        .from('commitments')
        .insert(
          rows.map((r) => ({
            user_id: user.id,
            issuer_name: issuerName,
            agency,
            commitment_text: r.text,
            kind: r.kind,
            status: 'open',
          }))
        )
        .select('*')
      if (insErr) throw new Error(insErr.message)
      setItems([
        ...((data ?? []) as Commitment[]),
        ...items,
      ])
      setDrafts({ quantitative: '', qualitative: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: 'open' | 'met') {
    try {
      const supabase = createClient()
      await supabase.from('commitments').update({ status }).eq('id', id)
      setItems(items.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch {
      // Non-fatal.
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 print:hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Commitments to {agency}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Track what you&apos;ve committed to with agencies — analysts remember
        and check. Open commitments are probed in your future {agency}{' '}
        simulations for this issuer.
      </p>
      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['quantitative', 'qualitative'] as const).map((kind) => (
            <label key={kind} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                {KIND_META[kind].label}{' '}
                <span className="font-normal text-muted">
                  — {KIND_META[kind].hint}
                </span>
              </span>
              <textarea
                value={drafts[kind]}
                onChange={(e) =>
                  setDrafts({ ...drafts, [kind]: e.target.value })
                }
                rows={3}
                placeholder={KIND_META[kind].placeholder}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">One commitment per line.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || (!drafts.quantitative.trim() && !drafts.qualitative.trim())}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save commitments'}
        </button>
      </form>

      {loaded && items.length > 0 && (
        <div className="mt-5 flex flex-col gap-4">
          {(['quantitative', 'qualitative'] as const).map((kind) => {
            const group = items.filter((c) => c.kind === kind)
            if (group.length === 0) return null
            return (
              <div key={kind}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {KIND_META[kind].label}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <p
                        className={[
                          'text-sm leading-relaxed',
                          c.status === 'met'
                            ? 'text-muted line-through'
                            : 'text-foreground',
                        ].join(' ')}
                      >
                        {c.commitment_text}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setStatus(c.id, c.status === 'met' ? 'open' : 'met')
                        }
                        className={[
                          'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
                          c.status === 'met'
                            ? 'border-border bg-surface text-muted hover:text-foreground'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        {c.status === 'met' ? 'Reopen' : 'Mark met'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
