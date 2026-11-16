import type { Localized } from '@/core/localized'

/**
 * Компетенции. Ключи в pct — русские названия: так они уже сохранены у студентов и в выгрузке,
 * поэтому для показа на другом языке используется BLOCK_KEY → blocks.<key>.
 */
export type Block = 'Биостатистика' | 'Работа с данными' | 'Интерпретация' | 'Работа с ИИ'
export const BLOCK_KEY: Record<string, string> = {
  'Биостатистика': 'biostat', 'Работа с данными': 'data', 'Интерпретация': 'interp', 'Работа с ИИ': 'ai',
}
const BLOCK_ORDER: Block[] = ['Биостатистика', 'Работа с данными', 'Интерпретация', 'Работа с ИИ']

export interface DiagnosticQuestion {
  block: Block
  question: Localized
  options: Localized[]
  answer: number
}

/** Показывается на главной, пока диагностика не пройдена. */
export const DEFAULT_PCT: Record<string, number> = { 'Биостатистика': 0, 'Работа с данными': 0, 'Интерпретация': 0, 'Работа с ИИ': 0 }

/**
 * Подсчёт диагностики: % верных ответов в каждой компетенции. Вопросы — domain/diagnostic/questions.ts
 * (вариант А — входная, Б — итоговая; по 5 вопросов на компетенцию).
 */
export class DiagnosticEvaluator {
  constructor(private questions: DiagnosticQuestion[], readonly variant: 'A' | 'B' = 'A') {}

  get count() { return this.questions.length }
  question(i: number) { return this.questions[i] }

  /** Ответы сохранены для этого набора вопросов? (иначе — старое демо из 4 вопросов, проходить заново) */
  matches(answers: unknown[] | undefined): boolean { return Array.isArray(answers) && answers.length === this.count }

  percentages(answers: (number | null)[]): Record<string, number> {
    return Object.fromEntries(BLOCK_ORDER.map(block => {
      const items = this.questions.map((q, i) => ({ q, i })).filter(x => x.q.block === block)
      const right = items.filter(({ q, i }) => answers[i] === q.answer).length
      return [block, items.length ? Math.round(right / items.length * 100) : 0]
    }))
  }

  /** Всего верных ответов (для выгрузки и сравнения «до/после»). */
  score(answers: (number | null)[]): number {
    return this.questions.filter((q, i) => answers[i] === q.answer).length
  }

  weakest(pct: Record<string, number>): string {
    return Object.entries(pct).sort((a, b) => a[1] - b[1])[0][0]
  }
}
