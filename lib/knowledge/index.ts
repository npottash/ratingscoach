import type { Agency } from '@/lib/types'
import type { KnowledgeCell } from './types'

// Bank × Capital Adequacy
import bank_capital_sp from './bank/capital_adequacy/sp.json'
import bank_capital_moodys from './bank/capital_adequacy/moodys.json'
import bank_capital_fitch from './bank/capital_adequacy/fitch.json'

// Bank × Asset Quality
import bank_asset_sp from './bank/asset_quality/sp.json'
import bank_asset_moodys from './bank/asset_quality/moodys.json'
import bank_asset_fitch from './bank/asset_quality/fitch.json'

// Bank × Funding and Liquidity
import bank_funding_sp from './bank/funding_and_liquidity/sp.json'
import bank_funding_moodys from './bank/funding_and_liquidity/moodys.json'
import bank_funding_fitch from './bank/funding_and_liquidity/fitch.json'

// Bank × Earnings Outlook
import bank_earnings_sp from './bank/earnings_outlook/sp.json'
import bank_earnings_moodys from './bank/earnings_outlook/moodys.json'
import bank_earnings_fitch from './bank/earnings_outlook/fitch.json'

// Bank × Risk Management
import bank_risk_sp from './bank/risk_management/sp.json'
import bank_risk_moodys from './bank/risk_management/moodys.json'
import bank_risk_fitch from './bank/risk_management/fitch.json'

// Bank × Strategic & Macro
import bank_strategic_sp from './bank/strategic_and_macro/sp.json'
import bank_strategic_moodys from './bank/strategic_and_macro/moodys.json'
import bank_strategic_fitch from './bank/strategic_and_macro/fitch.json'

// NBFI × Capital Adequacy
import nbfi_capital_sp from './non_bank_financial_institution/capital_adequacy/sp.json'
import nbfi_capital_moodys from './non_bank_financial_institution/capital_adequacy/moodys.json'
import nbfi_capital_fitch from './non_bank_financial_institution/capital_adequacy/fitch.json'

// NBFI × Asset Quality
import nbfi_asset_sp from './non_bank_financial_institution/asset_quality/sp.json'
import nbfi_asset_moodys from './non_bank_financial_institution/asset_quality/moodys.json'
import nbfi_asset_fitch from './non_bank_financial_institution/asset_quality/fitch.json'

// NBFI × Funding and Liquidity
import nbfi_funding_sp from './non_bank_financial_institution/funding_and_liquidity/sp.json'
import nbfi_funding_moodys from './non_bank_financial_institution/funding_and_liquidity/moodys.json'
import nbfi_funding_fitch from './non_bank_financial_institution/funding_and_liquidity/fitch.json'

// NBFI × Earnings Outlook
import nbfi_earnings_sp from './non_bank_financial_institution/earnings_outlook/sp.json'
import nbfi_earnings_moodys from './non_bank_financial_institution/earnings_outlook/moodys.json'
import nbfi_earnings_fitch from './non_bank_financial_institution/earnings_outlook/fitch.json'

// NBFI × Risk Management
import nbfi_risk_sp from './non_bank_financial_institution/risk_management/sp.json'
import nbfi_risk_moodys from './non_bank_financial_institution/risk_management/moodys.json'
import nbfi_risk_fitch from './non_bank_financial_institution/risk_management/fitch.json'

// NBFI × Strategic & Macro
import nbfi_strategic_sp from './non_bank_financial_institution/strategic_and_macro/sp.json'
import nbfi_strategic_moodys from './non_bank_financial_institution/strategic_and_macro/moodys.json'
import nbfi_strategic_fitch from './non_bank_financial_institution/strategic_and_macro/fitch.json'

// Sovereign × Economic Strength
import sov_economic_sp from './sovereign/economic_strength/sp.json'
import sov_economic_moodys from './sovereign/economic_strength/moodys.json'
import sov_economic_fitch from './sovereign/economic_strength/fitch.json'

// Sovereign × Institutional & Governance
import sov_institutional_sp from './sovereign/institutional_and_governance/sp.json'
import sov_institutional_moodys from './sovereign/institutional_and_governance/moodys.json'
import sov_institutional_fitch from './sovereign/institutional_and_governance/fitch.json'

// Sovereign × Fiscal Strength
import sov_fiscal_sp from './sovereign/fiscal_strength/sp.json'
import sov_fiscal_moodys from './sovereign/fiscal_strength/moodys.json'
import sov_fiscal_fitch from './sovereign/fiscal_strength/fitch.json'

// Sovereign × External Position
import sov_external_sp from './sovereign/external_position/sp.json'
import sov_external_moodys from './sovereign/external_position/moodys.json'
import sov_external_fitch from './sovereign/external_position/fitch.json'

// Sovereign × Monetary Flexibility
import sov_monetary_sp from './sovereign/monetary_flexibility/sp.json'
import sov_monetary_moodys from './sovereign/monetary_flexibility/moodys.json'
import sov_monetary_fitch from './sovereign/monetary_flexibility/fitch.json'

// Sovereign × Event & Political Risk
import sov_event_sp from './sovereign/event_and_political_risk/sp.json'
import sov_event_moodys from './sovereign/event_and_political_risk/moodys.json'
import sov_event_fitch from './sovereign/event_and_political_risk/fitch.json'

const SECTOR_SLUGS: Record<string, string> = {
  Bank: 'bank',
  Insurance: 'insurance',
  'Asset Manager': 'asset_manager',
  'Non-Bank Financial Institution': 'non_bank_financial_institution',
  Sovereign: 'sovereign',
  'Corporate IG': 'corporate_ig',
  'Corporate HY': 'corporate_hy',
}

const FACTOR_SLUGS: Record<string, string> = {
  'Capital Adequacy': 'capital_adequacy',
  'Asset Quality': 'asset_quality',
  'Funding and Liquidity': 'funding_and_liquidity',
  'Earnings Outlook': 'earnings_outlook',
  'Risk Management': 'risk_management',
  'Strategic & Macro': 'strategic_and_macro',
  'Economic Strength': 'economic_strength',
  'Institutional & Governance': 'institutional_and_governance',
  'Fiscal Strength': 'fiscal_strength',
  'External Position': 'external_position',
  'Monetary Flexibility': 'monetary_flexibility',
  'Event & Political Risk': 'event_and_political_risk',
}

const AGENCY_SLUGS: Record<Agency, string> = {
  'S&P': 'sp',
  "Moody's": 'moodys',
  Fitch: 'fitch',
}

const CELLS: Record<string, KnowledgeCell> = {
  'bank|capital_adequacy|sp': bank_capital_sp,
  'bank|capital_adequacy|moodys': bank_capital_moodys,
  'bank|capital_adequacy|fitch': bank_capital_fitch,

  'bank|asset_quality|sp': bank_asset_sp,
  'bank|asset_quality|moodys': bank_asset_moodys,
  'bank|asset_quality|fitch': bank_asset_fitch,

  'bank|funding_and_liquidity|sp': bank_funding_sp,
  'bank|funding_and_liquidity|moodys': bank_funding_moodys,
  'bank|funding_and_liquidity|fitch': bank_funding_fitch,

  'bank|earnings_outlook|sp': bank_earnings_sp,
  'bank|earnings_outlook|moodys': bank_earnings_moodys,
  'bank|earnings_outlook|fitch': bank_earnings_fitch,

  'bank|risk_management|sp': bank_risk_sp,
  'bank|risk_management|moodys': bank_risk_moodys,
  'bank|risk_management|fitch': bank_risk_fitch,

  'bank|strategic_and_macro|sp': bank_strategic_sp,
  'bank|strategic_and_macro|moodys': bank_strategic_moodys,
  'bank|strategic_and_macro|fitch': bank_strategic_fitch,

  'non_bank_financial_institution|capital_adequacy|sp': nbfi_capital_sp,
  'non_bank_financial_institution|capital_adequacy|moodys': nbfi_capital_moodys,
  'non_bank_financial_institution|capital_adequacy|fitch': nbfi_capital_fitch,

  'non_bank_financial_institution|asset_quality|sp': nbfi_asset_sp,
  'non_bank_financial_institution|asset_quality|moodys': nbfi_asset_moodys,
  'non_bank_financial_institution|asset_quality|fitch': nbfi_asset_fitch,

  'non_bank_financial_institution|funding_and_liquidity|sp': nbfi_funding_sp,
  'non_bank_financial_institution|funding_and_liquidity|moodys': nbfi_funding_moodys,
  'non_bank_financial_institution|funding_and_liquidity|fitch': nbfi_funding_fitch,

  'non_bank_financial_institution|earnings_outlook|sp': nbfi_earnings_sp,
  'non_bank_financial_institution|earnings_outlook|moodys': nbfi_earnings_moodys,
  'non_bank_financial_institution|earnings_outlook|fitch': nbfi_earnings_fitch,

  'non_bank_financial_institution|risk_management|sp': nbfi_risk_sp,
  'non_bank_financial_institution|risk_management|moodys': nbfi_risk_moodys,
  'non_bank_financial_institution|risk_management|fitch': nbfi_risk_fitch,

  'non_bank_financial_institution|strategic_and_macro|sp': nbfi_strategic_sp,
  'non_bank_financial_institution|strategic_and_macro|moodys': nbfi_strategic_moodys,
  'non_bank_financial_institution|strategic_and_macro|fitch': nbfi_strategic_fitch,

  'sovereign|economic_strength|sp': sov_economic_sp,
  'sovereign|economic_strength|moodys': sov_economic_moodys,
  'sovereign|economic_strength|fitch': sov_economic_fitch,

  'sovereign|institutional_and_governance|sp': sov_institutional_sp,
  'sovereign|institutional_and_governance|moodys': sov_institutional_moodys,
  'sovereign|institutional_and_governance|fitch': sov_institutional_fitch,

  'sovereign|fiscal_strength|sp': sov_fiscal_sp,
  'sovereign|fiscal_strength|moodys': sov_fiscal_moodys,
  'sovereign|fiscal_strength|fitch': sov_fiscal_fitch,

  'sovereign|external_position|sp': sov_external_sp,
  'sovereign|external_position|moodys': sov_external_moodys,
  'sovereign|external_position|fitch': sov_external_fitch,

  'sovereign|monetary_flexibility|sp': sov_monetary_sp,
  'sovereign|monetary_flexibility|moodys': sov_monetary_moodys,
  'sovereign|monetary_flexibility|fitch': sov_monetary_fitch,

  'sovereign|event_and_political_risk|sp': sov_event_sp,
  'sovereign|event_and_political_risk|moodys': sov_event_moodys,
  'sovereign|event_and_political_risk|fitch': sov_event_fitch,
}

export function getKnowledge(
  agency: Agency,
  sector: string,
  factor: string
): KnowledgeCell | null {
  const sectorSlug = SECTOR_SLUGS[sector]
  const factorSlug = FACTOR_SLUGS[factor]
  const agencySlug = AGENCY_SLUGS[agency]
  if (!sectorSlug || !factorSlug || !agencySlug) return null
  return CELLS[`${sectorSlug}|${factorSlug}|${agencySlug}`] ?? null
}

export type { KnowledgeCell, KnowledgeItem } from './types'
export { isEmptyCell, filterItemsForSubType } from './types'
export { loadPlaybook, type Playbook } from './playbook'
