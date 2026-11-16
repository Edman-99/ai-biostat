import type { ResearchApi } from '@/api/ResearchApi'
import type { AppStore } from '../AppStore'

/** События для исследования. Ошибки сети не мешают студенту — событие просто теряется. */
export class ResearchTracker {
  constructor(private app: AppStore, private api: ResearchApi) {}

  track(type: 'step_enter' | 'code_run' | 'tutor_open', payload?: Record<string, unknown>) {
    const s = this.app.getState()
    const caseId = s.activeCaseId
    this.api.event({ case_id: caseId, step: this.app.caseProgress(caseId).step, type, payload }).catch(() => {})
  }

  /** Событие вне кейса: репетитор из меню, модуль «Анализ», тренажёр «Проверка ИИ». */
  trackSection(type: 'tutor_open' | 'analysis_run' | 'aicheck_answer', payload?: Record<string, unknown>) {
    this.api.event({ case_id: null, step: null, type, payload: { source: 'section', ...payload } }).catch(() => {})
  }

  diagnostic(answers: (number | null)[], pct: Record<string, number>) {
    this.api.diagnostic('A', answers, pct).catch(() => {})
  }
}
