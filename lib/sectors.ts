export const SECTORS = [
  'Bank',
  'Insurance',
  'Asset Manager',
  'Non-Bank Financial Institution',
  'Sovereign',
  'Corporate IG',
  'Corporate HY',
] as const

export type Sector = (typeof SECTORS)[number]
