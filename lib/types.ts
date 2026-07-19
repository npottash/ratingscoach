export type Agency = 'S&P' | "Moody's" | 'Fitch'

export type Session = {
  id: string
  user_id: string
  issuer_name: string
  ticker: string | null
  sector: string
  industry: string | null
  sub_type: string | null
  current_rating: string
  outlook: string
  agency: Agency[]
  meeting_date: string | null
  meeting_type: string
  overall_score: number | null
  factors_flagged: number
  critical_gaps: number
  status: string
  created_at: string
}

/** One anticipated question + drafted model answer in a briefing book. */
export type BriefingQA = {
  factor: string
  question: string
  model_answer: string
  basis: 'asked' | 'anticipated'
}

/** The generated briefing book, persisted inside scorecard_output.briefing. */
export type BriefingOutput = {
  opening_statement: string
  qa: BriefingQA[]
  generated_at: string
}

/** One factor's guided prompts in the credit story builder. */
export type BuilderFactorPrompts = {
  factor: string
  explainer: string
  prompts: string[]
}

/** The generated prompt set the builder wizard walks through. */
export type BuilderPromptSet = {
  debut_prompts?: string[]
  factors: BuilderFactorPrompts[]
}

/** One agency's entry in the agency-fit comparison. */
export type AgencyFitEntry = {
  agency: Agency
  methodology_take: string
  constructive_signals: string[]
  watchouts: string[]
  basis: 'tracked_intel' | 'published_criteria'
}

/** The agency-fit analysis returned by /api/agency-fit. */
export type AgencyFitOutput = {
  ranking: Agency[]
  recommendation_rationale: string
  comparison: AgencyFitEntry[]
  /** True when generated without a credit story (sector-level only). */
  preliminary: boolean
}

export type IntakeInput = Omit<
  Session,
  | 'id'
  | 'user_id'
  | 'overall_score'
  | 'factors_flagged'
  | 'critical_gaps'
  | 'status'
  | 'created_at'
>
