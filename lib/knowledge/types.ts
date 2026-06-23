export type KnowledgeCell = {
  real_questions: string[]
  common_pitfalls: string[]
  strong_answer_markers: string[]
  agency_intel: string[]
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
