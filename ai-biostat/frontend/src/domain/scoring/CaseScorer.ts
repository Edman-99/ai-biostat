import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CaseProgress, Level } from '@/domain/progress/types'
import {
  AiTrapScorer, CodeScorer, DataErrorsScorer, InterpretationScorer, MethodScorer, QuestionScorer,
  VariableTypesScorer, type StepScorer,
} from './StepScorers'

export interface StepScore {
  key: string
  label: string
  value: number
  max: number
}

export interface ScoreSheet {
  steps: StepScore[]
  total: number
  byKey: Record<string, number>
}

/**
 * Предварительная оценка кейса (100 баллов). Считается в браузере — для пилота допустимо,
 * серверная проверка запланирована отдельно (CLAUDE.md, п. 6).
 */
export class CaseScorer {
  static readonly DEFAULT_SCORERS: StepScorer[] = [
    new DataErrorsScorer(), new VariableTypesScorer(), new QuestionScorer(), new MethodScorer(),
    new CodeScorer(), new InterpretationScorer(), new AiTrapScorer(),
  ]

  constructor(private scorers: StepScorer[] = CaseScorer.DEFAULT_SCORERS) {}

  score(def: CaseDefinition, progress: CaseProgress, level: Level): ScoreSheet {
    const ctx = { def, level }
    const steps = this.scorers.map(s => ({ key: s.key, label: s.label, max: s.max, value: s.score(progress, ctx) }))
    return {
      steps,
      total: steps.reduce((sum, s) => sum + s.value, 0),
      byKey: Object.fromEntries(steps.map(s => [s.key, s.value])),
    }
  }
}
