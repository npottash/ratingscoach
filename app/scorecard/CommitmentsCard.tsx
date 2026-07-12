'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agency } from '@/lib/types'

type Commitment = {
  id: string
  commitment_text: string
  status: string
  created_at: string
}

/**
 * Log commitments management made to the agency ("we told them buybacks
 * pause below 12.5% CET1"). Agencies remember and check — open commitments
 * are probed in future simulations for this issuer × agency.
 */
export function CommitmentsCard({
  issuerName,
  agency,
}: {
  issuerName: string
  agency: Agency
}) {
  const [items, setItems] = useState<Commitment[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('commitments')
          .select('id, commitment_text, status, created_at')
          .eq('issuer_name', issuerName)
          .eq('agency', agency)
          .order('created_at', { ascending: false })
        setItems(data ?? [])
      } catch {
        // Table may not exist yet — the card still renders for input.
      } finally {
        setLoaded(true)
      }
    })()
  }, [issuerName, agency])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const lines = draft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in.')
      const rows = lines.map((commitment_text) => ({
        user_id: user.id,
        issuer_name: issuerName,
        agency,
        commitment_text,
        status: 'open',
      }))
      const { data, error: insErr } = await supabase
        .from('commitments')
        .insert(rows)
        .select('id, commitment_text, status, created_at')
      if (insErr) throw new Error(insErr.message)
      setItems([...(data ?? []), ...items])
      setDraft('')
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
        Commitments made to {agency}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Log what management committed to in the real meeting, one per line —
        analysts remember and check. Open commitments are probed in your
        future {agency} simulations for this issuer.
      </p>
      <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="e.g. Buybacks pause if CET1 falls below 12.5%…"
          className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save commitments'}
        </button>
      </form>

      {loaded && items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3">
              <p
                className={[
                  'text-sm leading-relaxed',
                  c.status === 'met' ? 'text-muted line-through' : 'text-foreground',
                ].join(' ')}
              >
                {c.commitment_text}
              </p>
              <button
                type="button"
                onClick={() => setStatus(c.id, c.status === 'met' ? 'open' : 'met')}
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
      )}
    </section>
  )
}
