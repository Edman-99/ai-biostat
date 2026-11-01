/**
 * Прогресс прохождения кейса. Формат совпадает с тем, что сохраняла прежняя версия сайта
 * (поле state.cases[id] на сервере), — уже сохранённые ответы студентов читаются без миграции.
 */
export type CodeLang = 'R' | 'Python'
export type Level = 'pre' | 'post'   // pre — студент, post — специалист

export interface MethodAttempt {
  choice: number | null
  tries: number
  ok: boolean
  hint: boolean
  wrong?: boolean
  why?: string
}

export interface CaseProgress {
  step: number
  maxStep: number
  locked: boolean            // после шага 5 ответы шагов 1–4 только для просмотра
  flags: number[]            // шаг 2: отмеченные строки
  types: Record<string, string>
  outcome: string | null
  question: string
  m: MethodAttempt
  lang: CodeLang
  blanks: string[]
  free: string
  runs: number
  ran: boolean
  shown: boolean             // показан готовый код (−5)
  codeErr: string
  interp: string
  frag: number | null
  fix: string
  hints: number              // переходы к репетитору
  chat: unknown[]
  disputed: boolean
  score?: number
  grade?: string
}

export const newCaseProgress = (): CaseProgress => ({
  step: 1, maxStep: 1, locked: false, flags: [], types: {}, outcome: null, question: '',
  m: { choice: null, tries: 0, ok: false, hint: false },
  lang: 'R', blanks: ['', ''], free: '', runs: 0, ran: false, shown: false, codeErr: '',
  interp: '', frag: null, fix: '', hints: 0, chat: [], disputed: false,
})

export interface SavedState {
  diagAns: (number | null)[]
  diagDone: boolean
  pct: Record<string, number> | null
  cases: Record<string, CaseProgress>
}
