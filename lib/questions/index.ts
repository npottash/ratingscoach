import { BANK_QUESTIONS } from './bank'

const BY_SECTOR: Record<string, Record<string, string[]>> = {
  Bank: BANK_QUESTIONS,
}

export function questionsFor(sector: string, factor: string): string[] {
  return BY_SECTOR[sector]?.[factor] ?? []
}
