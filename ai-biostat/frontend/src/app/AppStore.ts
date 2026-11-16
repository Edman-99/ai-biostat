import { Store } from '@/core/store/Store'
import type { User } from '@/api/types'
import { newCaseProgress, type CaseProgress, type Level, type SavedState } from '@/domain/progress/types'
import type { AiCheckAnswer } from '@/domain/aicheck/AiCheckTrainer'

export type Screen = 'login' | 'diag' | 'diagres' | 'home' | 'player' | 'teacher' | 'profile'
  | 'cases' | 'tutor' | 'analysis' | 'aicheck' | 'progress' | 'exitdiag'

export type DiagKind = 'entry' | 'exit'

/** Разделы бокового меню студента и специалиста (по порядку). */
export const LEARNER_SECTIONS: Screen[] = ['home', 'diagres', 'cases', 'tutor', 'analysis', 'aicheck', 'progress']

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
  /** итоговая диагностика (вариант Б), открывает преподаватель */
  exit: DiagState
  cases: Record<string, CaseProgress>
  /** тренажёр «Проверка ИИ»: id задания → ответ */
  trainer: Record<string, AiCheckAnswer>
  activeCaseId: string
  tutorOpen: boolean
  /** вкладка панели преподавателя (сохраняется при выходе в предпросмотр кейса) */
  teacherTab: string
}

const initial = (): AppState => ({
  screen: 'login', prevScreen: null, me: null,
  diag: { idx: 0, answers: [], done: false, pct: null },
  exit: { idx: 0, answers: [], done: false, pct: null },
  cases: {}, trainer: {}, activeCaseId: '21', tutorOpen: false, teacherTab: 'review',
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
        if (saved.exit) next.exit = { ...s.exit, answers: saved.exit.answers || [], done: !!saved.exit.done, pct: saved.exit.pct || null }
        next.cases = Object.fromEntries(
          Object.entries(saved.cases || {}).map(([id, c]) => [id, { ...newCaseProgress(), ...c }]))
        next.trainer = saved.trainer || {}
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

  setTeacherTab(tab: string) { this.setState(s => ({ ...s, teacherTab: tab })) }

  /** Предпросмотр кейса преподавателем: все шаги открыты, ничего не сохраняется (AutoSaver не пишет за преподавателя). */
  previewCase(id: string) {
    this.setState(s => ({ ...s, activeCaseId: id, screen: 'player', cases: { ...s.cases, [id]: { ...newCaseProgress(), maxStep: 10 } } }))
  }

  // ---------- диагностика: entry — входная (вариант А), exit — итоговая (вариант Б) ----------
  private patchDiag(kind: DiagKind, f: (d: DiagState) => Partial<DiagState>) {
    const key = kind === 'exit' ? 'exit' : 'diag'
    this.setState(s => ({ ...s, [key]: { ...s[key], ...f(s[key]) } }))
  }

  answerDiag(kind: DiagKind, i: number, answer: number) {
    this.patchDiag(kind, d => { const answers = [...d.answers]; answers[i] = answer; return { answers } })
  }

  nextDiagQuestion(kind: DiagKind) { this.patchDiag(kind, d => ({ idx: d.idx + 1 })) }

  finishDiag(kind: DiagKind, pct: Record<string, number>) { this.patchDiag(kind, () => ({ done: true, pct })) }

  startExitDiag() {
    this.setState(s => ({ ...s, exit: s.exit.done ? s.exit : { ...s.exit, idx: 0 }, screen: s.exit.done ? 'diagres' : 'exitdiag' }))
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

  // ---------- тренажёр «Проверка ИИ» ----------
  saveTrainerAnswer(taskId: string, answer: Omit<AiCheckAnswer, 'tries'>) {
    this.setState(s => {
      const prev = s.trainer[taskId]
      // однажды решённое задание остаётся решённым
      const next: AiCheckAnswer = { ...answer, ok: answer.ok || !!prev?.ok, tries: (prev?.tries ?? 0) + 1 }
      return { ...s, trainer: { ...s.trainer, [taskId]: next } }
    })
  }

  setTutorOpen(open: boolean) { this.setState(s => ({ ...s, tutorOpen: open })) }
  toggleTutor() { this.setState(s => ({ ...s, tutorOpen: !s.tutorOpen })) }
}
