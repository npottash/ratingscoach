'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Agency Behavior',
  'FIG Concepts',
  'Narrative Craft',
  'Historical Patterns',
  'Lingo',
  'Meeting Dynamics',
  'Common Mistakes',
] as const

const AGENCIES = ['S&P', "Moody's", 'Fitch', 'All'] as const
const SECTORS = ['FIG Bank', 'FIG Insurance', 'All'] as const

const inputClass =
  'rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'

type IngestResult = { ok: true; count: number } | { ok: false; error: string }

export function IngestForm() {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<string>('')
  const [agency, setAgency] = useState<string>('')
  const [sector, setSector] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !text.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), category, agency, sector }),
      })
      const json = await res.json()
      if (!res.ok) {
        setResult({ ok: false, error: json?.error || `Request failed (${res.status})` })
      } else {
        setResult({ ok: true, count: json.count ?? 0 })
        setText('')
      }
    } catch (err) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-lg border border-border bg-white p-6"
    >
      <label className={labelClass}>
        <span>Raw knowledge</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste raw notes. The pipeline will clean, chunk into 300-500 word segments, embed, and store."
          required
          className={inputClass}
        />
        <span className="text-xs font-normal text-muted">
          Long form is fine — Claude chunks it at natural topical boundaries.
        </span>
      </label>

      <div className="grid gap-6 sm:grid-cols-3">
        <label className={labelClass}>
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span>Agency</span>
          <select
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select agency
            </option>
            {AGENCIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span>Sector</span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select sector
            </option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result && result.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved {result.count} chunk{result.count === 1 ? '' : 's'} to the
          knowledge base.
        </p>
      )}

      {result && !result.ok && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            loading || !text.trim() || !category || !agency || !sector
          }
          className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? 'Processing…' : 'Ingest'}
        </button>
      </div>
    </form>
  )
}
