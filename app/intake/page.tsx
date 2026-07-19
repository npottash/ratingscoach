'use client'

import { useActionState, useState } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import {
  AgencyFitPanel,
  type AgencyFitRequest,
} from '@/components/AgencyFitPanel'
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

const RATINGS = [
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

const OUTLOOKS = [
  'Stable',
  'Positive',
  'Negative',
  'Watch Positive',
  'Watch Negative',
] as const

const MEETING_TYPES = [
  'Annual Review',
  'New Rating Request',
  'Transaction Update',
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
  const [fitRequest, setFitRequest] = useState<AgencyFitRequest | null>(null)
  const [fitHint, setFitHint] = useState<string | null>(null)
  const [state, action, pending] = useActionState(submitIntake, initialState)

  const subTypeSuggestions = SUB_TYPES_BY_SECTOR[sector] ?? []

  function openAgencyFit(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form
    if (!sector || !form) {
      setFitHint('Select a sector first — the comparison is sector-specific.')
      return
    }
    setFitHint(null)
    const fd = new FormData(form)
    const str = (name: string) => String(fd.get(name) ?? '').trim() || null
    setFitRequest({
      context: {
        issuer_name: str('issuer_name'),
        sector,
        industry: str('industry'),
        sub_type: str('sub_type'),
        current_rating: str('current_rating'),
        outlook: str('outlook'),
        ticker: str('ticker'),
        meeting_type: meetingType || null,
      },
      current_agency: agency,
    })
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
              <span>Outlook</span>
              <select
                name="outlook"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select outlook
                </option>
                {OUTLOOKS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
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

          <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>Agency</span>
            <div className="flex flex-wrap gap-2">
              {AGENCIES.map((a) => {
                const selected = agency === a
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => setAgency(a)}
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
              <div className="mt-1">
                <button
                  type="button"
                  onClick={openAgencyFit}
                  className="rounded-md border border-brand/40 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition hover:border-brand"
                >
                  Not sure? Compare agencies for your profile
                </button>
                {fitHint && (
                  <p className="mt-1.5 text-xs font-normal text-amber-700">
                    {fitHint}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Current rating</span>
              <select
                name="current_rating"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select rating
                </option>
                {RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span>
                Meeting date{' '}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input name="meeting_date" type="date" className={inputClass} />
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
              {pending ? 'Saving…' : 'Continue to narrative'}
            </button>
          </div>
        </form>
      </main>

      {fitRequest && (
        <AgencyFitPanel
          request={fitRequest}
          currentAgency={agency}
          pickLabel={(a) => `Prepare for ${a}`}
          onPick={(a) => setAgency(a)}
          onClose={() => setFitRequest(null)}
        />
      )}
    </>
  )
}
