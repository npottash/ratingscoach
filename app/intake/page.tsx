'use client'

import { useActionState, useState } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { submitIntake, type IntakeFormState } from './actions'
import type { Agency } from '@/lib/types'

const SECTORS = [
  'Bank',
  'Insurance',
  'Asset Manager',
  'Non-Bank Financial Institution',
  'Sovereign',
  'Corporate IG',
  'Corporate HY',
] as const

// S&P / Fitch scale and the Moody's scale, index-aligned so a selection
// carries over when the user switches agency (AA+ ↔ Aa1, etc.).
const SP_FITCH_RATINGS = [
  'AAA',
  'AA+',
  'AA',
  'AA-',
  'A+',
  'A',
  'A-',
  'BBB+',
  'BBB',
  'BBB-',
  'BB+',
  'BB',
  'BB-',
  'B+',
  'B',
  'B-',
  'Not yet rated',
] as const

const MOODYS_RATINGS = [
  'Aaa',
  'Aa1',
  'Aa2',
  'Aa3',
  'A1',
  'A2',
  'A3',
  'Baa1',
  'Baa2',
  'Baa3',
  'Ba1',
  'Ba2',
  'Ba3',
  'B1',
  'B2',
  'B3',
  'Not yet rated',
] as const

// Index-aligned: Moody's puts ratings "on review", not "on watch".
const SP_FITCH_OUTLOOKS = [
  'Stable',
  'Positive',
  'Negative',
  'Watch Positive',
  'Watch Negative',
] as const

const MOODYS_OUTLOOKS = [
  'Stable',
  'Positive',
  'Negative',
  'Review for Upgrade',
  'Review for Downgrade',
] as const

function ratingsFor(agency: Agency): readonly string[] {
  return agency === "Moody's" ? MOODYS_RATINGS : SP_FITCH_RATINGS
}

function outlooksFor(agency: Agency): readonly string[] {
  return agency === "Moody's" ? MOODYS_OUTLOOKS : SP_FITCH_OUTLOOKS
}

const MEETING_TYPES = [
  'Annual Review',
  'New Rating Request',
  'Transaction Review',
] as const

const TRANSACTION_TYPES = [
  'Acquisition',
  'Merger',
  'Divestiture / Asset Sale',
  'Spin-off',
  'Debt Issuance / Refinancing',
  'Dividend Recapitalization',
  'Share Buyback',
  'Equity / Capital Raise',
  'LBO / Take-Private',
  'Other',
] as const

const CORPORATE_INDUSTRIES = [
  'Aerospace, Defense & Industrials',
  'Auto',
  'Chemicals & Materials',
  'Consumer Products & Services',
  'Energy',
  'Healthcare',
  'Media, Telecom & Technology',
  'Real Estate',
  'Retail',
  'Transportation & Logistics',
  'Utilities & Power',
  'Gaming, Lodging & Leisure',
] as const

const SUB_TYPES_BY_SECTOR: Record<string, readonly string[]> = {
  Bank: [
    'Money Center / Global G-SIB',
    'Trust / Custody Bank',
    'Regional / Super-Regional Bank (>$100bn in Assets)',
    'Community Bank',
    'Online / Digital Bank / Neobank / Fintech Bank',
  ],
  Insurance: [
    'Life Insurance',
    'Property & Casualty',
    'Reinsurance — Life',
    'Reinsurance — P&C',
    'Health Insurance / Managed Care',
    'Title Insurance',
    'Mortgage Insurance',
    'Multi-line / Diversified',
  ],
  'Asset Manager': [
    'Traditional — Active Equity & Fixed Income',
    'Alternative — Private Equity / Credit',
    'Alternative — Hedge Fund (Multi-strategy / Diversified)',
    'Alternative — Real Estate',
    'Alternative — Infrastructure',
    'Wealth Management / Private Bank',
    'Sovereign Wealth Fund / GRE',
  ],
  'Non-Bank Financial Institution': [
    'Finance Co — Auto Lender',
    'Finance Co — Credit Card Lender',
    'Finance Co — Mortgage Lender',
    'Finance Co — Consumer Lender',
    'Finance Co — Commercial / Equipment Lender',
    'Business Development Company (BDC)',
    'Mortgage REIT',
    'CRE / Commercial Real Estate Lender',
    'Exchange / Clearinghouse',
    'Securities Firm — Broker-Dealer',
    'Securities Firm — Market Maker',
    'Securities Firm — Prime Broker',
    'Independent Investment Bank',
  ],
  Sovereign: [
    'Developed Market (DM)',
    'Emerging Market (EM)',
    'Frontier Market',
    'Sub-Sovereign — State / Province',
    'Sub-Sovereign — Municipal',
    'Supranational (IMF, World Bank, EIB, etc.)',
  ],
  'Corporate IG': CORPORATE_INDUSTRIES,
  'Corporate HY': CORPORATE_INDUSTRIES,
}

const AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

const initialState: IntakeFormState = undefined

const inputClass =
  'rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'

export default function IntakePage() {
  const [agency, setAgency] = useState<Agency>('S&P')
  const [sector, setSector] = useState<string>('')
  const [meetingType, setMeetingType] = useState<string>('')
  const [rating, setRating] = useState<string>('')
  const [outlook, setOutlook] = useState<string>('')
  const [state, action, pending] = useActionState(submitIntake, initialState)

  const subTypeSuggestions = SUB_TYPES_BY_SECTOR[sector] ?? []

  // Carry the selection across scales when the agency changes (AA+ → Aa1,
  // Watch Negative → Review for Downgrade); clear it if there's no equivalent.
  function handleAgencyChange(next: Agency) {
    const mapAcross = (value: string, from: readonly string[], to: readonly string[]) => {
      const i = from.indexOf(value)
      return i === -1 ? '' : to[i]
    }
    setRating((r) => mapAcross(r, ratingsFor(agency), ratingsFor(next)))
    setOutlook((o) =>
      o === 'Not yet rated'
        ? o
        : mapAcross(o, outlooksFor(agency), outlooksFor(next))
    )
    setAgency(next)
  }

  return (
    <>
      <PageHeader />
      <StepIndicator current={1} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Session intake
          </h1>
          <p className="mt-2 text-muted">
            Tell us about your business and background on the upcoming meeting.
            This shapes the simulation.
          </p>
        </header>

        <form action={action} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Issuer name</span>
              <input name="issuer_name" required className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>
                Ticker{' '}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input name="ticker" className={inputClass} />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Sector</span>
              <select
                name="sector"
                required
                value={sector}
                onChange={(e) => setSector(e.target.value)}
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
            <label className={labelClass}>
              <span>
                Sub-type{' '}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              {/* Keyed by sector so the selection resets on sector change. */}
              <select
                key={sector}
                name="sub_type"
                defaultValue=""
                disabled={!sector}
                className={inputClass}
              >
                <option value="">
                  {sector
                    ? 'Select sub-type'
                    : 'Select a sector first'}
                </option>
                {subTypeSuggestions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className={labelClass}>
              <span>
                Meeting date{' '}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input name="meeting_date" type="date" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>Meeting type</span>
              <select
                name="meeting_type"
                required
                defaultValue=""
                onChange={(e) => setMeetingType(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select meeting type
                </option>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {meetingType === 'Transaction Review' && (
            <fieldset className="rounded-lg border border-brand/40 bg-brand/5 p-4">
              <legend className="px-1 text-sm font-medium text-foreground">
                About the transaction{' '}
                <span className="font-normal text-muted">
                  (optional — sharpens the simulation)
                </span>
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  <span>Transaction type</span>
                  <select
                    name="transaction_type"
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="">Select type</option>
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>
                    Approximate size (in 000s){' '}
                    <span className="font-normal text-muted">(optional)</span>
                  </span>
                  <input
                    name="transaction_size"
                    placeholder="e.g. 750,000"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  <span>
                    Financing mix{' '}
                    <span className="font-normal text-muted">(optional)</span>
                  </span>
                  <input
                    name="transaction_financing_mix"
                    placeholder="e.g. 60% new debt / 40% cash on hand"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  <span>
                    Expected close{' '}
                    <span className="font-normal text-muted">(optional)</span>
                  </span>
                  <input
                    name="transaction_expected_close"
                    placeholder="e.g. Q4 2026"
                    className={inputClass}
                  />
                </label>
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>Agency</span>
            <div className="flex flex-wrap gap-2">
              {AGENCIES.map((a) => {
                const selected = agency === a
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => handleAgencyChange(a)}
                    className={[
                      'rounded-md border px-4 py-2 text-sm font-medium transition',
                      selected
                        ? 'border-brand bg-brand text-white'
                        : 'border-border bg-white text-foreground hover:border-brand',
                    ].join(' ')}
                    aria-pressed={selected}
                  >
                    {a}
                  </button>
                )
              })}
            </div>
            <input type="hidden" name="agency" value={agency} />
            <span className="text-xs font-normal text-muted">
              Select the agency you&apos;re preparing for.
            </span>
            {meetingType === 'New Rating Request' && (
              <p className="mt-1 rounded-md border border-brand/40 bg-brand/5 px-4 py-3 text-sm font-normal text-foreground">
                Not sure which agency? Select any for now — once we collect
                your credit story on the next step, we&apos;ll recommend the
                best agency fit and you can switch before the simulation.
              </p>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Current rating</span>
              <select
                name="current_rating"
                required
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select rating
                </option>
                {ratingsFor(agency).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span>
                Outlook{' '}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <select
                name="outlook"
                value={outlook}
                onChange={(e) => setOutlook(e.target.value)}
                className={inputClass}
              >
                <option value="">Select outlook</option>
                <option value="Not yet rated">Not yet rated</option>
                {outlooksFor(agency).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {pending ? 'Loading…' : 'Continue to narrative'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
