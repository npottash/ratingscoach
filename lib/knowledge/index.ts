import type { Agency } from '@/lib/types'
import type { KnowledgeCell } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// GENERATED CELL MATRIX — every sector × factor × agency combination has a
// JSON file. To add content, edit the JSON cell directly; to add a new sector
// or factor, add the slug mapping below, create the JSON files, and extend the
// import list and CELLS map (keep them in sync with lib/factors.ts).
// ─────────────────────────────────────────────────────────────────────────────

// Bank × Capital Adequacy
import bank_capital_adequacy_sp from './bank/capital_adequacy/sp.json'
import bank_capital_adequacy_moodys from './bank/capital_adequacy/moodys.json'
import bank_capital_adequacy_fitch from './bank/capital_adequacy/fitch.json'

// Bank × Asset Quality
import bank_asset_quality_sp from './bank/asset_quality/sp.json'
import bank_asset_quality_moodys from './bank/asset_quality/moodys.json'
import bank_asset_quality_fitch from './bank/asset_quality/fitch.json'

// Bank × Funding and Liquidity
import bank_funding_and_liquidity_sp from './bank/funding_and_liquidity/sp.json'
import bank_funding_and_liquidity_moodys from './bank/funding_and_liquidity/moodys.json'
import bank_funding_and_liquidity_fitch from './bank/funding_and_liquidity/fitch.json'

// Bank × Earnings Outlook
import bank_earnings_outlook_sp from './bank/earnings_outlook/sp.json'
import bank_earnings_outlook_moodys from './bank/earnings_outlook/moodys.json'
import bank_earnings_outlook_fitch from './bank/earnings_outlook/fitch.json'

// Bank × Risk Management
import bank_risk_management_sp from './bank/risk_management/sp.json'
import bank_risk_management_moodys from './bank/risk_management/moodys.json'
import bank_risk_management_fitch from './bank/risk_management/fitch.json'

// Bank × Strategic & Macro
import bank_strategic_and_macro_sp from './bank/strategic_and_macro/sp.json'
import bank_strategic_and_macro_moodys from './bank/strategic_and_macro/moodys.json'
import bank_strategic_and_macro_fitch from './bank/strategic_and_macro/fitch.json'

// Insurance × Capitalization
import insurance_capitalization_sp from './insurance/capitalization/sp.json'
import insurance_capitalization_moodys from './insurance/capitalization/moodys.json'
import insurance_capitalization_fitch from './insurance/capitalization/fitch.json'

// Insurance × Operating Performance
import insurance_operating_performance_sp from './insurance/operating_performance/sp.json'
import insurance_operating_performance_moodys from './insurance/operating_performance/moodys.json'
import insurance_operating_performance_fitch from './insurance/operating_performance/fitch.json'

// Insurance × Business Profile
import insurance_business_profile_sp from './insurance/business_profile/sp.json'
import insurance_business_profile_moodys from './insurance/business_profile/moodys.json'
import insurance_business_profile_fitch from './insurance/business_profile/fitch.json'

// Insurance × Enterprise Risk Management
import insurance_enterprise_risk_management_sp from './insurance/enterprise_risk_management/sp.json'
import insurance_enterprise_risk_management_moodys from './insurance/enterprise_risk_management/moodys.json'
import insurance_enterprise_risk_management_fitch from './insurance/enterprise_risk_management/fitch.json'

// Insurance × Investment Portfolio
import insurance_investment_portfolio_sp from './insurance/investment_portfolio/sp.json'
import insurance_investment_portfolio_moodys from './insurance/investment_portfolio/moodys.json'
import insurance_investment_portfolio_fitch from './insurance/investment_portfolio/fitch.json'

// Insurance × Strategic & Macro
import insurance_strategic_and_macro_sp from './insurance/strategic_and_macro/sp.json'
import insurance_strategic_and_macro_moodys from './insurance/strategic_and_macro/moodys.json'
import insurance_strategic_and_macro_fitch from './insurance/strategic_and_macro/fitch.json'

// Asset Manager × AUM Trends
import asset_manager_aum_trends_sp from './asset_manager/aum_trends/sp.json'
import asset_manager_aum_trends_moodys from './asset_manager/aum_trends/moodys.json'
import asset_manager_aum_trends_fitch from './asset_manager/aum_trends/fitch.json'

// Asset Manager × Fee Structure
import asset_manager_fee_structure_sp from './asset_manager/fee_structure/sp.json'
import asset_manager_fee_structure_moodys from './asset_manager/fee_structure/moodys.json'
import asset_manager_fee_structure_fitch from './asset_manager/fee_structure/fitch.json'

// Asset Manager × Investment Performance
import asset_manager_investment_performance_sp from './asset_manager/investment_performance/sp.json'
import asset_manager_investment_performance_moodys from './asset_manager/investment_performance/moodys.json'
import asset_manager_investment_performance_fitch from './asset_manager/investment_performance/fitch.json'

// Asset Manager × Operating Leverage
import asset_manager_operating_leverage_sp from './asset_manager/operating_leverage/sp.json'
import asset_manager_operating_leverage_moodys from './asset_manager/operating_leverage/moodys.json'
import asset_manager_operating_leverage_fitch from './asset_manager/operating_leverage/fitch.json'

// Asset Manager × Distribution
import asset_manager_distribution_sp from './asset_manager/distribution/sp.json'
import asset_manager_distribution_moodys from './asset_manager/distribution/moodys.json'
import asset_manager_distribution_fitch from './asset_manager/distribution/fitch.json'

// Asset Manager × Strategic & Macro
import asset_manager_strategic_and_macro_sp from './asset_manager/strategic_and_macro/sp.json'
import asset_manager_strategic_and_macro_moodys from './asset_manager/strategic_and_macro/moodys.json'
import asset_manager_strategic_and_macro_fitch from './asset_manager/strategic_and_macro/fitch.json'

// Non-Bank Financial Institution × Capital Adequacy
import non_bank_financial_institution_capital_adequacy_sp from './non_bank_financial_institution/capital_adequacy/sp.json'
import non_bank_financial_institution_capital_adequacy_moodys from './non_bank_financial_institution/capital_adequacy/moodys.json'
import non_bank_financial_institution_capital_adequacy_fitch from './non_bank_financial_institution/capital_adequacy/fitch.json'

// Non-Bank Financial Institution × Asset Quality
import non_bank_financial_institution_asset_quality_sp from './non_bank_financial_institution/asset_quality/sp.json'
import non_bank_financial_institution_asset_quality_moodys from './non_bank_financial_institution/asset_quality/moodys.json'
import non_bank_financial_institution_asset_quality_fitch from './non_bank_financial_institution/asset_quality/fitch.json'

// Non-Bank Financial Institution × Funding and Liquidity
import non_bank_financial_institution_funding_and_liquidity_sp from './non_bank_financial_institution/funding_and_liquidity/sp.json'
import non_bank_financial_institution_funding_and_liquidity_moodys from './non_bank_financial_institution/funding_and_liquidity/moodys.json'
import non_bank_financial_institution_funding_and_liquidity_fitch from './non_bank_financial_institution/funding_and_liquidity/fitch.json'

// Non-Bank Financial Institution × Earnings Outlook
import non_bank_financial_institution_earnings_outlook_sp from './non_bank_financial_institution/earnings_outlook/sp.json'
import non_bank_financial_institution_earnings_outlook_moodys from './non_bank_financial_institution/earnings_outlook/moodys.json'
import non_bank_financial_institution_earnings_outlook_fitch from './non_bank_financial_institution/earnings_outlook/fitch.json'

// Non-Bank Financial Institution × Risk Management
import non_bank_financial_institution_risk_management_sp from './non_bank_financial_institution/risk_management/sp.json'
import non_bank_financial_institution_risk_management_moodys from './non_bank_financial_institution/risk_management/moodys.json'
import non_bank_financial_institution_risk_management_fitch from './non_bank_financial_institution/risk_management/fitch.json'

// Non-Bank Financial Institution × Strategic & Macro
import non_bank_financial_institution_strategic_and_macro_sp from './non_bank_financial_institution/strategic_and_macro/sp.json'
import non_bank_financial_institution_strategic_and_macro_moodys from './non_bank_financial_institution/strategic_and_macro/moodys.json'
import non_bank_financial_institution_strategic_and_macro_fitch from './non_bank_financial_institution/strategic_and_macro/fitch.json'

// Sovereign × Economic Strength
import sovereign_economic_strength_sp from './sovereign/economic_strength/sp.json'
import sovereign_economic_strength_moodys from './sovereign/economic_strength/moodys.json'
import sovereign_economic_strength_fitch from './sovereign/economic_strength/fitch.json'

// Sovereign × Institutional & Governance
import sovereign_institutional_and_governance_sp from './sovereign/institutional_and_governance/sp.json'
import sovereign_institutional_and_governance_moodys from './sovereign/institutional_and_governance/moodys.json'
import sovereign_institutional_and_governance_fitch from './sovereign/institutional_and_governance/fitch.json'

// Sovereign × Fiscal Strength
import sovereign_fiscal_strength_sp from './sovereign/fiscal_strength/sp.json'
import sovereign_fiscal_strength_moodys from './sovereign/fiscal_strength/moodys.json'
import sovereign_fiscal_strength_fitch from './sovereign/fiscal_strength/fitch.json'

// Sovereign × External Position
import sovereign_external_position_sp from './sovereign/external_position/sp.json'
import sovereign_external_position_moodys from './sovereign/external_position/moodys.json'
import sovereign_external_position_fitch from './sovereign/external_position/fitch.json'

// Sovereign × Monetary Flexibility
import sovereign_monetary_flexibility_sp from './sovereign/monetary_flexibility/sp.json'
import sovereign_monetary_flexibility_moodys from './sovereign/monetary_flexibility/moodys.json'
import sovereign_monetary_flexibility_fitch from './sovereign/monetary_flexibility/fitch.json'

// Sovereign × Event & Political Risk
import sovereign_event_and_political_risk_sp from './sovereign/event_and_political_risk/sp.json'
import sovereign_event_and_political_risk_moodys from './sovereign/event_and_political_risk/moodys.json'
import sovereign_event_and_political_risk_fitch from './sovereign/event_and_political_risk/fitch.json'

// Corporate IG × Business Risk Profile
import corporate_ig_business_risk_profile_sp from './corporate_ig/business_risk_profile/sp.json'
import corporate_ig_business_risk_profile_moodys from './corporate_ig/business_risk_profile/moodys.json'
import corporate_ig_business_risk_profile_fitch from './corporate_ig/business_risk_profile/fitch.json'

// Corporate IG × Financial Risk Profile
import corporate_ig_financial_risk_profile_sp from './corporate_ig/financial_risk_profile/sp.json'
import corporate_ig_financial_risk_profile_moodys from './corporate_ig/financial_risk_profile/moodys.json'
import corporate_ig_financial_risk_profile_fitch from './corporate_ig/financial_risk_profile/fitch.json'

// Corporate IG × Liquidity
import corporate_ig_liquidity_sp from './corporate_ig/liquidity/sp.json'
import corporate_ig_liquidity_moodys from './corporate_ig/liquidity/moodys.json'
import corporate_ig_liquidity_fitch from './corporate_ig/liquidity/fitch.json'

// Corporate IG × Cash Flow
import corporate_ig_cash_flow_sp from './corporate_ig/cash_flow/sp.json'
import corporate_ig_cash_flow_moodys from './corporate_ig/cash_flow/moodys.json'
import corporate_ig_cash_flow_fitch from './corporate_ig/cash_flow/fitch.json'

// Corporate IG × Industry Dynamics
import corporate_ig_industry_dynamics_sp from './corporate_ig/industry_dynamics/sp.json'
import corporate_ig_industry_dynamics_moodys from './corporate_ig/industry_dynamics/moodys.json'
import corporate_ig_industry_dynamics_fitch from './corporate_ig/industry_dynamics/fitch.json'

// Corporate IG × Strategic & Macro
import corporate_ig_strategic_and_macro_sp from './corporate_ig/strategic_and_macro/sp.json'
import corporate_ig_strategic_and_macro_moodys from './corporate_ig/strategic_and_macro/moodys.json'
import corporate_ig_strategic_and_macro_fitch from './corporate_ig/strategic_and_macro/fitch.json'

// Corporate HY × Business Risk Profile
import corporate_hy_business_risk_profile_sp from './corporate_hy/business_risk_profile/sp.json'
import corporate_hy_business_risk_profile_moodys from './corporate_hy/business_risk_profile/moodys.json'
import corporate_hy_business_risk_profile_fitch from './corporate_hy/business_risk_profile/fitch.json'

// Corporate HY × Financial Risk Profile
import corporate_hy_financial_risk_profile_sp from './corporate_hy/financial_risk_profile/sp.json'
import corporate_hy_financial_risk_profile_moodys from './corporate_hy/financial_risk_profile/moodys.json'
import corporate_hy_financial_risk_profile_fitch from './corporate_hy/financial_risk_profile/fitch.json'

// Corporate HY × Liquidity
import corporate_hy_liquidity_sp from './corporate_hy/liquidity/sp.json'
import corporate_hy_liquidity_moodys from './corporate_hy/liquidity/moodys.json'
import corporate_hy_liquidity_fitch from './corporate_hy/liquidity/fitch.json'

// Corporate HY × Cash Flow
import corporate_hy_cash_flow_sp from './corporate_hy/cash_flow/sp.json'
import corporate_hy_cash_flow_moodys from './corporate_hy/cash_flow/moodys.json'
import corporate_hy_cash_flow_fitch from './corporate_hy/cash_flow/fitch.json'

// Corporate HY × Industry Dynamics
import corporate_hy_industry_dynamics_sp from './corporate_hy/industry_dynamics/sp.json'
import corporate_hy_industry_dynamics_moodys from './corporate_hy/industry_dynamics/moodys.json'
import corporate_hy_industry_dynamics_fitch from './corporate_hy/industry_dynamics/fitch.json'

// Corporate HY × Strategic & Macro
import corporate_hy_strategic_and_macro_sp from './corporate_hy/strategic_and_macro/sp.json'
import corporate_hy_strategic_and_macro_moodys from './corporate_hy/strategic_and_macro/moodys.json'
import corporate_hy_strategic_and_macro_fitch from './corporate_hy/strategic_and_macro/fitch.json'

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
  Capitalization: 'capitalization',
  'Operating Performance': 'operating_performance',
  'Business Profile': 'business_profile',
  'Enterprise Risk Management': 'enterprise_risk_management',
  'Investment Portfolio': 'investment_portfolio',
  'AUM Trends': 'aum_trends',
  'Fee Structure': 'fee_structure',
  'Investment Performance': 'investment_performance',
  'Operating Leverage': 'operating_leverage',
  Distribution: 'distribution',
  'Business Risk Profile': 'business_risk_profile',
  'Financial Risk Profile': 'financial_risk_profile',
  Liquidity: 'liquidity',
  'Cash Flow': 'cash_flow',
  'Industry Dynamics': 'industry_dynamics',
}

const AGENCY_SLUGS: Record<Agency, string> = {
  'S&P': 'sp',
  "Moody's": 'moodys',
  Fitch: 'fitch',
}

const CELLS: Record<string, KnowledgeCell> = {
  'bank|capital_adequacy|sp': bank_capital_adequacy_sp,
  'bank|capital_adequacy|moodys': bank_capital_adequacy_moodys,
  'bank|capital_adequacy|fitch': bank_capital_adequacy_fitch,
  'bank|asset_quality|sp': bank_asset_quality_sp,
  'bank|asset_quality|moodys': bank_asset_quality_moodys,
  'bank|asset_quality|fitch': bank_asset_quality_fitch,
  'bank|funding_and_liquidity|sp': bank_funding_and_liquidity_sp,
  'bank|funding_and_liquidity|moodys': bank_funding_and_liquidity_moodys,
  'bank|funding_and_liquidity|fitch': bank_funding_and_liquidity_fitch,
  'bank|earnings_outlook|sp': bank_earnings_outlook_sp,
  'bank|earnings_outlook|moodys': bank_earnings_outlook_moodys,
  'bank|earnings_outlook|fitch': bank_earnings_outlook_fitch,
  'bank|risk_management|sp': bank_risk_management_sp,
  'bank|risk_management|moodys': bank_risk_management_moodys,
  'bank|risk_management|fitch': bank_risk_management_fitch,
  'bank|strategic_and_macro|sp': bank_strategic_and_macro_sp,
  'bank|strategic_and_macro|moodys': bank_strategic_and_macro_moodys,
  'bank|strategic_and_macro|fitch': bank_strategic_and_macro_fitch,
  'insurance|capitalization|sp': insurance_capitalization_sp,
  'insurance|capitalization|moodys': insurance_capitalization_moodys,
  'insurance|capitalization|fitch': insurance_capitalization_fitch,
  'insurance|operating_performance|sp': insurance_operating_performance_sp,
  'insurance|operating_performance|moodys': insurance_operating_performance_moodys,
  'insurance|operating_performance|fitch': insurance_operating_performance_fitch,
  'insurance|business_profile|sp': insurance_business_profile_sp,
  'insurance|business_profile|moodys': insurance_business_profile_moodys,
  'insurance|business_profile|fitch': insurance_business_profile_fitch,
  'insurance|enterprise_risk_management|sp': insurance_enterprise_risk_management_sp,
  'insurance|enterprise_risk_management|moodys': insurance_enterprise_risk_management_moodys,
  'insurance|enterprise_risk_management|fitch': insurance_enterprise_risk_management_fitch,
  'insurance|investment_portfolio|sp': insurance_investment_portfolio_sp,
  'insurance|investment_portfolio|moodys': insurance_investment_portfolio_moodys,
  'insurance|investment_portfolio|fitch': insurance_investment_portfolio_fitch,
  'insurance|strategic_and_macro|sp': insurance_strategic_and_macro_sp,
  'insurance|strategic_and_macro|moodys': insurance_strategic_and_macro_moodys,
  'insurance|strategic_and_macro|fitch': insurance_strategic_and_macro_fitch,
  'asset_manager|aum_trends|sp': asset_manager_aum_trends_sp,
  'asset_manager|aum_trends|moodys': asset_manager_aum_trends_moodys,
  'asset_manager|aum_trends|fitch': asset_manager_aum_trends_fitch,
  'asset_manager|fee_structure|sp': asset_manager_fee_structure_sp,
  'asset_manager|fee_structure|moodys': asset_manager_fee_structure_moodys,
  'asset_manager|fee_structure|fitch': asset_manager_fee_structure_fitch,
  'asset_manager|investment_performance|sp': asset_manager_investment_performance_sp,
  'asset_manager|investment_performance|moodys': asset_manager_investment_performance_moodys,
  'asset_manager|investment_performance|fitch': asset_manager_investment_performance_fitch,
  'asset_manager|operating_leverage|sp': asset_manager_operating_leverage_sp,
  'asset_manager|operating_leverage|moodys': asset_manager_operating_leverage_moodys,
  'asset_manager|operating_leverage|fitch': asset_manager_operating_leverage_fitch,
  'asset_manager|distribution|sp': asset_manager_distribution_sp,
  'asset_manager|distribution|moodys': asset_manager_distribution_moodys,
  'asset_manager|distribution|fitch': asset_manager_distribution_fitch,
  'asset_manager|strategic_and_macro|sp': asset_manager_strategic_and_macro_sp,
  'asset_manager|strategic_and_macro|moodys': asset_manager_strategic_and_macro_moodys,
  'asset_manager|strategic_and_macro|fitch': asset_manager_strategic_and_macro_fitch,
  'non_bank_financial_institution|capital_adequacy|sp': non_bank_financial_institution_capital_adequacy_sp,
  'non_bank_financial_institution|capital_adequacy|moodys': non_bank_financial_institution_capital_adequacy_moodys,
  'non_bank_financial_institution|capital_adequacy|fitch': non_bank_financial_institution_capital_adequacy_fitch,
  'non_bank_financial_institution|asset_quality|sp': non_bank_financial_institution_asset_quality_sp,
  'non_bank_financial_institution|asset_quality|moodys': non_bank_financial_institution_asset_quality_moodys,
  'non_bank_financial_institution|asset_quality|fitch': non_bank_financial_institution_asset_quality_fitch,
  'non_bank_financial_institution|funding_and_liquidity|sp': non_bank_financial_institution_funding_and_liquidity_sp,
  'non_bank_financial_institution|funding_and_liquidity|moodys': non_bank_financial_institution_funding_and_liquidity_moodys,
  'non_bank_financial_institution|funding_and_liquidity|fitch': non_bank_financial_institution_funding_and_liquidity_fitch,
  'non_bank_financial_institution|earnings_outlook|sp': non_bank_financial_institution_earnings_outlook_sp,
  'non_bank_financial_institution|earnings_outlook|moodys': non_bank_financial_institution_earnings_outlook_moodys,
  'non_bank_financial_institution|earnings_outlook|fitch': non_bank_financial_institution_earnings_outlook_fitch,
  'non_bank_financial_institution|risk_management|sp': non_bank_financial_institution_risk_management_sp,
  'non_bank_financial_institution|risk_management|moodys': non_bank_financial_institution_risk_management_moodys,
  'non_bank_financial_institution|risk_management|fitch': non_bank_financial_institution_risk_management_fitch,
  'non_bank_financial_institution|strategic_and_macro|sp': non_bank_financial_institution_strategic_and_macro_sp,
  'non_bank_financial_institution|strategic_and_macro|moodys': non_bank_financial_institution_strategic_and_macro_moodys,
  'non_bank_financial_institution|strategic_and_macro|fitch': non_bank_financial_institution_strategic_and_macro_fitch,
  'sovereign|economic_strength|sp': sovereign_economic_strength_sp,
  'sovereign|economic_strength|moodys': sovereign_economic_strength_moodys,
  'sovereign|economic_strength|fitch': sovereign_economic_strength_fitch,
  'sovereign|institutional_and_governance|sp': sovereign_institutional_and_governance_sp,
  'sovereign|institutional_and_governance|moodys': sovereign_institutional_and_governance_moodys,
  'sovereign|institutional_and_governance|fitch': sovereign_institutional_and_governance_fitch,
  'sovereign|fiscal_strength|sp': sovereign_fiscal_strength_sp,
  'sovereign|fiscal_strength|moodys': sovereign_fiscal_strength_moodys,
  'sovereign|fiscal_strength|fitch': sovereign_fiscal_strength_fitch,
  'sovereign|external_position|sp': sovereign_external_position_sp,
  'sovereign|external_position|moodys': sovereign_external_position_moodys,
  'sovereign|external_position|fitch': sovereign_external_position_fitch,
  'sovereign|monetary_flexibility|sp': sovereign_monetary_flexibility_sp,
  'sovereign|monetary_flexibility|moodys': sovereign_monetary_flexibility_moodys,
  'sovereign|monetary_flexibility|fitch': sovereign_monetary_flexibility_fitch,
  'sovereign|event_and_political_risk|sp': sovereign_event_and_political_risk_sp,
  'sovereign|event_and_political_risk|moodys': sovereign_event_and_political_risk_moodys,
  'sovereign|event_and_political_risk|fitch': sovereign_event_and_political_risk_fitch,
  'corporate_ig|business_risk_profile|sp': corporate_ig_business_risk_profile_sp,
  'corporate_ig|business_risk_profile|moodys': corporate_ig_business_risk_profile_moodys,
  'corporate_ig|business_risk_profile|fitch': corporate_ig_business_risk_profile_fitch,
  'corporate_ig|financial_risk_profile|sp': corporate_ig_financial_risk_profile_sp,
  'corporate_ig|financial_risk_profile|moodys': corporate_ig_financial_risk_profile_moodys,
  'corporate_ig|financial_risk_profile|fitch': corporate_ig_financial_risk_profile_fitch,
  'corporate_ig|liquidity|sp': corporate_ig_liquidity_sp,
  'corporate_ig|liquidity|moodys': corporate_ig_liquidity_moodys,
  'corporate_ig|liquidity|fitch': corporate_ig_liquidity_fitch,
  'corporate_ig|cash_flow|sp': corporate_ig_cash_flow_sp,
  'corporate_ig|cash_flow|moodys': corporate_ig_cash_flow_moodys,
  'corporate_ig|cash_flow|fitch': corporate_ig_cash_flow_fitch,
  'corporate_ig|industry_dynamics|sp': corporate_ig_industry_dynamics_sp,
  'corporate_ig|industry_dynamics|moodys': corporate_ig_industry_dynamics_moodys,
  'corporate_ig|industry_dynamics|fitch': corporate_ig_industry_dynamics_fitch,
  'corporate_ig|strategic_and_macro|sp': corporate_ig_strategic_and_macro_sp,
  'corporate_ig|strategic_and_macro|moodys': corporate_ig_strategic_and_macro_moodys,
  'corporate_ig|strategic_and_macro|fitch': corporate_ig_strategic_and_macro_fitch,
  'corporate_hy|business_risk_profile|sp': corporate_hy_business_risk_profile_sp,
  'corporate_hy|business_risk_profile|moodys': corporate_hy_business_risk_profile_moodys,
  'corporate_hy|business_risk_profile|fitch': corporate_hy_business_risk_profile_fitch,
  'corporate_hy|financial_risk_profile|sp': corporate_hy_financial_risk_profile_sp,
  'corporate_hy|financial_risk_profile|moodys': corporate_hy_financial_risk_profile_moodys,
  'corporate_hy|financial_risk_profile|fitch': corporate_hy_financial_risk_profile_fitch,
  'corporate_hy|liquidity|sp': corporate_hy_liquidity_sp,
  'corporate_hy|liquidity|moodys': corporate_hy_liquidity_moodys,
  'corporate_hy|liquidity|fitch': corporate_hy_liquidity_fitch,
  'corporate_hy|cash_flow|sp': corporate_hy_cash_flow_sp,
  'corporate_hy|cash_flow|moodys': corporate_hy_cash_flow_moodys,
  'corporate_hy|cash_flow|fitch': corporate_hy_cash_flow_fitch,
  'corporate_hy|industry_dynamics|sp': corporate_hy_industry_dynamics_sp,
  'corporate_hy|industry_dynamics|moodys': corporate_hy_industry_dynamics_moodys,
  'corporate_hy|industry_dynamics|fitch': corporate_hy_industry_dynamics_fitch,
  'corporate_hy|strategic_and_macro|sp': corporate_hy_strategic_and_macro_sp,
  'corporate_hy|strategic_and_macro|moodys': corporate_hy_strategic_and_macro_moodys,
  'corporate_hy|strategic_and_macro|fitch': corporate_hy_strategic_and_macro_fitch,
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
