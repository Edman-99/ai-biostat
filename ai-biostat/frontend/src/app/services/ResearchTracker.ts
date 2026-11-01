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

  diagnostic(answers: (number | null)[], pct: Record<string, number>) {
    this.api.diagnostic('A', answers, pct).catch(() => {})
  }
}
