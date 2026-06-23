import type { Sector } from '@/lib/sectors'

const STRATEGIC_AND_MACRO = 'Strategic & Macro'

export const FACTORS_BY_SECTOR: Record<Sector, readonly string[]> = {
  Bank: [
    'Capital Adequacy',
    'Asset Quality',
    'Funding and Liquidity',
    'Earnings Outlook',
    'Risk Management',
    STRATEGIC_AND_MACRO,
  ],
  Insurance: [
    'Capitalization',
    'Operating Performance',
    'Business Profile',
    'Enterprise Risk Management',
    'Investment Portfolio',
    STRATEGIC_AND_MACRO,
  ],
  'Asset Manager': [
    'AUM Trends',
    'Fee Structure',
    'Investment Performance',
    'Operating Leverage',
    'Distribution',
    STRATEGIC_AND_MACRO,
  ],
  'Non-Bank Financial Institution': [
    'Capital Adequacy',
    'Asset Quality',
    'Funding and Liquidity',
    'Earnings Outlook',
    'Risk Management',
    STRATEGIC_AND_MACRO,
  ],
  Sovereign: [
    'Economic Strength',
    'Institutional & Governance',
    'Fiscal Strength',
    'External Position',
    'Monetary Flexibility',
    'Event & Political Risk',
  ],
  'Corporate IG': [
    'Business Risk Profile',
    'Financial Risk Profile',
    'Liquidity',
    'Cash Flow',
    'Industry Dynamics',
    STRATEGIC_AND_MACRO,
  ],
  'Corporate HY': [
    'Business Risk Profile',
    'Financial Risk Profile',
    'Liquidity',
    'Cash Flow',
    'Industry Dynamics',
    STRATEGIC_AND_MACRO,
  ],
}

export function factorsFor(sector: string): readonly string[] {
  return (
    FACTORS_BY_SECTOR[sector as Sector] ?? FACTORS_BY_SECTOR['Corporate IG']
  )
}
