import { toRegExp, type CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CaseProgress, Level } from '@/domain/progress/types'
import { wordCount } from '@/core/text'

export interface ScoringContext {
  def: CaseDefinition
  level: Level
}

/** Стратегия подсчёта баллов одного шага. Новый тип задания = новый класс, CaseScorer не меняется. */
export interface StepScorer {
  readonly key: string
  readonly label: string
  readonly max: number
  score(p: CaseProgress, ctx: ScoringContext): number
}

export const minInterpretationWords = (level: Level) => (level === 'post' ? 60 : 40)

export class DataErrorsScorer implements StepScorer {
  readonly key = 'data'; readonly label = 'Данные'; readonly max = 10
  score(p: CaseProgress, { def }: ScoringContext) {
    const total = Object.keys(def.data.errors).length
    const found = p.flags.filter(f => def.data.errors[f]).length
    const wrong = p.flags.length - found
    return Math.max(0, Math.round(found / total * 10) - wrong * 2)
  }
}

export class VariableTypesScorer implements StepScorer {
  readonly key = 'types'; readonly label = 'Типы переменных'; readonly max = 10
  score(p: CaseProgress, { def }: ScoringContext) {
    const vars = def.variables
    const right = vars.filter(v => p.types[v.key] === v.expected || v.accepted?.includes(p.types[v.key] as never)).length
    return Math.round(right / vars.length * 8) + (p.outcome === def.outcome ? 2 : 0)
  }
}

export class QuestionScorer implements StepScorer {
  readonly key = 'question'; readonly label = 'Вопрос'; readonly max = 5
  score(p: CaseProgress) { return wordCount(p.question) >= 6 ? 5 : 0 }
}

export class MethodScorer implements StepScorer {
  readonly key = 'method'; readonly label = 'Метод'; readonly max = 20
  score(p: CaseProgress) { return p.m.ok ? (p.m.tries === 1 ? 20 : 15) : 0 }
}

export class CodeScorer implements StepScorer {
  readonly key = 'code'; readonly label = 'Код'; readonly max = 15
  score(p: CaseProgress) { return p.ran ? (p.shown ? 10 : 15) : 0 }
}

export class InterpretationScorer implements StepScorer {
  readonly key = 'interp'; readonly label = 'Интерпретация'; readonly max = 25
  score(p: CaseProgress, { def, level }: ScoringContext) {
    const items = def.interpretation.checklist.filter(c => toRegExp(c.pattern).test(p.interp)).length
    return items * 5 + (wordCount(p.interp) >= minInterpretationWords(level) ? 5 : 0)
  }
}

export class AiTrapScorer implements StepScorer {
  readonly key = 'ai'; readonly label = 'Проверка ИИ'; readonly max = 15
  score(p: CaseProgress, { def }: ScoringContext) {
    return (p.frag === def.aiTrap.wrongIndex ? 8 : 0) + (toRegExp(def.aiTrap.explanation).test(p.fix) ? 7 : 0)
  }
}
