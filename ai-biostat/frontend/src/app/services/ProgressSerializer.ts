import type { CaseRegistry } from '@/cases/CaseRegistry'
import type { GradeScale } from '@/domain/grading/GradeScale'
import type { CaseScorer } from '@/domain/scoring/CaseScorer'
import type { Level, SavedState } from '@/domain/progress/types'
import type { AppState } from '../AppStore'

/** Превращает состояние приложения в то, что хранится на сервере (PUT /api/state). */
export class ProgressSerializer {
  constructor(private registry: CaseRegistry, private scorer: CaseScorer, private grades: GradeScale) {}

  toSaved(s: AppState, level: Level): SavedState {
    const cases = Object.fromEntries(Object.entries(s.cases).map(([id, c]) => {
      const def = this.registry.get(id)
      if (!def || c.maxStep < 9) return [id, c]
      const total = this.scorer.score(def, c, level).total
      return [id, { ...c, score: total, grade: this.grades.gradeOf(total).letter }]
    }))
    return { diagAns: s.diag.answers, diagDone: s.diag.done, pct: s.diag.pct, cases }
  }
}
