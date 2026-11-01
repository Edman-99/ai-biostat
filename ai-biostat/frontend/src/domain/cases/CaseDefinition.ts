import type { CodeLang } from '@/domain/progress/types'

/**
 * Описание кейса — только данные, без логики. Плеер кейса и подсчёт баллов работают с любым кейсом,
 * описанным по этой схеме, поэтому новые кейсы (1, 4, 22, 23) добавляются без правки плеера (OCP).
 * Регулярные выражения хранятся строками — так схему можно будет грузить из JSON.
 * В текстах **жирный** выделяется двумя звёздочками.
 */
export type VarType = 'q' | 'n' | 'o' | 'b' | 'id'

export interface Pattern {
  source: string
  flags?: string
}

export interface CaseVariable {
  key: string
  label: string
  expected: VarType
  /** другие типы, которые засчитываются как верные */
  accepted?: VarType[]
}

export interface ChecklistItem {
  label: string
  pattern: Pattern
}

export interface CaseDefinition {
  id: string
  title: string
  shortTitle: string

  situation: { paragraphs: string[]; goal: string }

  data: {
    fileName: string
    totalRows: number
    columns: string[]
    /** первые строки, которые видит студент; ключ id — номер строки */
    preview: Record<string, string | number>[]
    /** номер строки → описание ошибки */
    errors: Record<number, string>
    retryHint: string
    allFoundNote: string
  }

  variables: CaseVariable[]
  outcome: string

  method: {
    question: string
    options: string[]
    correct: number
    retryHint: string
    failNote: string
  }

  code: {
    /** строки шаблона; [0], [1] … — пропуски для студента */
    templates: Record<CodeLang, string[]>
    blankAnswers: string[]
    /** что должно быть в коде специалиста, чтобы он «выполнился» (все шаблоны) */
    freeRequired: Pattern[]
    outputs: Record<CodeLang, string>
    errors: Record<CodeLang, string>
    chart: { title: string; bars: [string, number][] }
  }

  interpretation: { checklist: ChecklistItem[] }

  aiTrap: {
    fragments: string[]
    wrongIndex: number
    explanation: Pattern
  }

  debrief: {
    referenceConclusion: string
    typesRepeat: string
    methodSecondTryRepeat: string
    methodFailedRepeat: string
    aiFound: string
    aiMissed: string
    aiRepeat: string
    disputeSteps: string[]
  }

  tutor: { quick: Record<number, string[]> }
}

export const toRegExp = (p: Pattern): RegExp => new RegExp(p.source, p.flags)
