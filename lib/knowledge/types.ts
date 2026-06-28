export type KnowledgeItem = string | { text: string; sub_types?: string[] }

export type KnowledgeCell = {
  real_questions: KnowledgeItem[]
  common_pitfalls: KnowledgeItem[]
  strong_answer_markers: KnowledgeItem[]
  agency_intel: KnowledgeItem[]
}

export function isEmptyCell(cell: KnowledgeCell | null): boolean {
  if (!cell) return true
  return (
    cell.real_questions.length === 0 &&
    cell.common_pitfalls.length === 0 &&
    cell.strong_answer_markers.length === 0 &&
    cell.agency_intel.length === 0
  )
}

/**
 * Filter an items list by the active session sub-type.
 *
 * - Plain string item → always included (universal).
 * - Object with no sub_types or empty sub_types → always included (universal).
 * - Object with sub_types → included only if the session sub_type matches.
 *
 * Returns the plain text of matching items.
 */
export function filterItemsForSubType(
  items: KnowledgeItem[],
  subType: string | null
): string[] {
  return items
    .filter((item) => {
      if (typeof item === 'string') return true
      if (!item.sub_types || item.sub_types.length === 0) return true
      if (!subType) return false
      return item.sub_types.includes(subType)
    })
    .map((item) => (typeof item === 'string' ? item : item.text))
}
