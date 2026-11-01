/** Формы данных, которыми обмениваются фронтенд и сервер (app/main.py). */

export type ServerRole = 'student' | 'specialist' | 'teacher'
export type Lang = 'ru' | 'kk' | 'en'

export interface User {
  code: string
  role: ServerRole
  group: string | null
  lang: Lang | null
  first_name: string
  last_name: string
}

export type AttemptStatus = 'in_progress' | 'completed' | 'disputed' | 'confirmed'

export interface OverviewPerson {
  code: string
  first_name: string | null
  last_name: string | null
  role: ServerRole
  grp: string | null
  case_id: string | null
  step: number | null
  max_step: number | null
  score: number | null
  grade: string | null
  status: AttemptStatus | null
  updated_at: number | null
  tutor_opens: number
}

export interface Dispute {
  id: number
  code: string
  case_id: string
  step: string
  text: string
  ai_score: number | null
  status: 'open' | 'resolved'
  first_name: string | null
  last_name: string | null
}

export interface Overview {
  people: OverviewPerson[]
  disputes: Dispute[]
}

export type ExportKind = 'attempts' | 'events' | 'diagnostics' | 'disputes'

export interface IssuedPassword {
  code: string
  password: string
  group?: string
  role?: ServerRole
}

export interface ImportResult {
  added: IssuedPassword[]
  skipped: string[]
  errors: string[]
}
