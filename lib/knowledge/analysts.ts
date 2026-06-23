import type { Agency } from '@/lib/types'
import type { Sector } from '@/lib/sectors'

export type LeadAnalyst = {
  name: string
  role?: string
}

// Lead analyst directory by sector × agency. Seeded from user-provided intel.
// Extendable via OVERLAY: notes or directly in this file.
const LEAD_ANALYSTS: Partial<
  Record<Sector, Partial<Record<Agency, LeadAnalyst>>>
> = {
  Bank: {
    'S&P': { name: 'Devi Arora' },
    "Moody's": { name: 'Jeff Berg' },
    Fitch: { name: 'Chris Wolfe' },
  },
}

export function getLeadAnalyst(
  sector: string,
  agency: Agency
): LeadAnalyst | null {
  return LEAD_ANALYSTS[sector as Sector]?.[agency] ?? null
}
