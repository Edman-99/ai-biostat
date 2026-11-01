import { Store } from '@/core/store/Store'
import type { User } from '@/api/types'
import { newCaseProgress, type CaseProgress, type Level, type SavedState } from '@/domain/progress/types'

export type Screen = 'login' | 'diag' | 'diagres' | 'home' | 'player' | 'teacher' | 'profile'

export interface DiagState {
  idx: number
  answers: (number | null)[]
  done: boolean
  pct: Record<string, number> | null
}

export interface AppState {
  screen: Screen
  prevScreen: Screen | null
  me: User | null
  diag: DiagState
  cases: Record<string, CaseProgress>
  activeCaseId: string
  tutorOpen: boolean
}

const initial = (): AppState => ({
  screen: 'login', prevScreen: null, me: null,
  diag: { idx: 0, answers: [], done: false, pct: null },
  cases: {}, activeCaseId: '21', tutorOpen: false,
})

/** Состояние приложения и все допустимые его изменения. Экраны не меняют состояние напрямую. */
export class AppStore extends Store<AppState> {
  constructor() { super(initial()) }

  // ---------- сессия ----------
  signIn(me: User, saved: SavedState | null) {
    this.setState(s => {
      const next: AppState = { ...s, me }
      if (saved) {
        next.diag = { ...s.diag, answers: saved.diagAns || [], done: !!saved.diagDone, pct: saved.pct || null }
        next.cases = Object.fromEntries(
          Object.entries(saved.cases || {}).map(([id, c]) => [id, { ...newCaseProgress(), ...c }]))
      }
      next.screen = me.role === 'teacher' ? 'teacher' : (next.diag.done ? 'home' : 'diag')
      return next
    })
  }

  reset() { this.setState(initial()) }

  setMe(me: User) { this.setState(s => ({ ...s, me })) }

  level(): Level { return this.getState().me?.role === 'specialist' ? 'post' : 'pre' }

  // ---------- навигация ----------
  navigate(screen: Screen) { this.setState(s => ({ ...s, screen })) }

  openProfile() {
    this.setState(s => ({ ...s, prevScreen: s.screen === 'profile' ? s.prevScreen : s.screen, screen: 'profile' }))
  }

  closeProfile() { this.setState(s => ({ ...s, screen: s.prevScreen || 'home' })) }

  openCase(id: string) { this.setState(s => ({ ...s, activeCaseId: id, screen: 'player' })) }

  // ---------- диагностика ----------
  answerDiag(i: number, answer: number) {
    this.setState(s => {
      const answers = [...s.diag.answers]
      answers[i] = answer
      return { ...s, diag: { ...s.diag, answers } }
    })
  }

  nextDiagQuestion() { this.setState(s => ({ ...s, diag: { ...s.diag, idx: s.diag.idx + 1 } })) }

  finishDiag(pct: Record<string, number>) {
    this.setState(s => ({ ...s, diag: { ...s.diag, done: true, pct } }))
  }

  // ---------- кейс ----------
  caseProgress(id: string): CaseProgress { return this.getState().cases[id] ?? newCaseProgress() }

  patchCase(id: string, patch: Partial<CaseProgress> | ((c: CaseProgress) => Partial<CaseProgress>)) {
    this.setState(s => {
      const cur = s.cases[id] ?? newCaseProgress()
      const delta = typeof patch === 'function' ? patch(cur) : patch
      return { ...s, cases: { ...s.cases, [id]: { ...cur, ...delta } } }
    })
  }

  goToStep(id: string, n: number) {
    this.patchCase(id, c => ({ step: n, maxStep: Math.max(c.maxStep, n) }))
  }

  setTutorOpen(open: boolean) { this.setState(s => ({ ...s, tutorOpen: open })) }
  toggleTutor() { this.setState(s => ({ ...s, tutorOpen: !s.tutorOpen })) }
}
