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
  meeting_date: string
  meeting_type: string
  key_topics: string | null
  overall_score: number | null
  factors_flagged: number
  critical_gaps: number
  status: string
  created_at: string
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
