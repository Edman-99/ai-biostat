import type { Block } from '@/domain/diagnostic/Diagnostic'
import type { ScoreSheet } from '@/domain/scoring/CaseScorer'

/**
 * Какие шаги кейса относятся к какой компетенции диагностики. Так входную диагностику можно
 * сравнить с тем, как человек справляется в кейсах («Мой прогресс», аналитика преподавателя).
 */
export const STEP_BLOCK: Record<string, Block> = {
  data: 'Работа с данными',
  types: 'Работа с данными',
  question: 'Биостатистика',
  method: 'Биостатистика',
  code: 'Биостатистика',
  interp: 'Интерпретация',
  ai: 'Работа с ИИ',
}

export const BLOCKS: Block[] = ['Биостатистика', 'Работа с данными', 'Интерпретация', 'Работа с ИИ']

const pct = (got: number, max: number) => (max ? Math.round(got / max * 100) : 0)

/** % по каждой компетенции по сумме всех завершённых кейсов; null — кейсов ещё нет. */
export function competenciesFromCases(sheets: ScoreSheet[]): Record<Block, number> | null {
  if (!sheets.length) return null
  const got: Record<string, number> = {}
  const max: Record<string, number> = {}
  sheets.forEach(sheet => sheet.steps.forEach(s => {
    const b = STEP_BLOCK[s.key]
    if (!b) return
    got[b] = (got[b] ?? 0) + s.value
    max[b] = (max[b] ?? 0) + s.max
  }))
  return Object.fromEntries(BLOCKS.map(b => [b, pct(got[b] ?? 0, max[b] ?? 0)])) as Record<Block, number>
}

/** Средний % выполнения каждого шага (ключи score.<key>) в порядке шагов кейса. */
export function stepSuccess(sheets: ScoreSheet[]): { key: string; pct: number }[] {
  if (!sheets.length) return []
  const keys = sheets[0].steps.map(s => s.key)
  return keys.map(key => {
    let got = 0, max = 0
    sheets.forEach(sh => sh.steps.filter(s => s.key === key).forEach(s => { got += s.value; max += s.max }))
    return { key, pct: pct(got, max) }
  })
}

/** Типичные затруднения: самые слабые шаги ниже порога, не больше трёх. */
export function weakestSteps(steps: { key: string; pct: number }[], threshold = 80, limit = 3) {
  return [...steps].filter(s => s.pct < threshold).sort((a, b) => a.pct - b.pct).slice(0, limit)
}
