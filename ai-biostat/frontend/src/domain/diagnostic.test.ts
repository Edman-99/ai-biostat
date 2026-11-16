import { describe, expect, it } from 'vitest'
import { DiagnosticEvaluator } from './diagnostic/Diagnostic'
import { DIAGNOSTIC_A, DIAGNOSTIC_B } from './diagnostic/questions'

const BLOCKS = ['Биостатистика', 'Работа с данными', 'Интерпретация', 'Работа с ИИ']

describe('диагностика: варианты А и Б', () => {
  it.each([['A', DIAGNOSTIC_A], ['B', DIAGNOSTIC_B]] as const)('вариант %s: 20 вопросов, по 5 на компетенцию, три языка', (_, qs) => {
    expect(qs.length).toBe(20)
    BLOCKS.forEach(b => expect(qs.filter(q => q.block === b).length).toBe(5))
    qs.forEach(q => {
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.options.length)
      for (const t of [q.question, ...q.options]) {
        expect(t.ru && t.kk && t.en).toBeTruthy()
        expect(t.kk).not.toBe(t.en)
      }
      expect(new Set(q.options.map(o => o.ru)).size).toBe(q.options.length)
    })
  })

  it('пары: вопрос N варианта А и Б — та же компетенция, столько же вариантов, разный текст', () => {
    DIAGNOSTIC_A.forEach((a, i) => {
      const b = DIAGNOSTIC_B[i]
      expect(b.block).toBe(a.block)
      expect(b.options.length).toBe(a.options.length)
      expect(b.question.ru).not.toBe(a.question.ru)
    })
  })

  it('правильный ответ не всегда на одном месте', () => {
    const pos = new Set(DIAGNOSTIC_A.map(q => q.answer))
    expect(pos.size).toBeGreaterThanOrEqual(4)
  })

  it('проценты по компетенциям и общий балл', () => {
    const ev = new DiagnosticEvaluator(DIAGNOSTIC_A)
    const all = DIAGNOSTIC_A.map(q => q.answer)
    expect(ev.percentages(all)).toEqual({ 'Биостатистика': 100, 'Работа с данными': 100, 'Интерпретация': 100, 'Работа с ИИ': 100 })
    expect(ev.score(all)).toBe(20)
    const firstThreeData = DIAGNOSTIC_A.map((q, i) => (i < 3 ? q.answer : null))
    expect(ev.percentages(firstThreeData)['Работа с данными']).toBe(60)
    expect(ev.percentages(firstThreeData)['Биостатистика']).toBe(0)
    expect(ev.matches(new Array(20).fill(0))).toBe(true)
    expect(ev.matches([1, 2, 1, 1])).toBe(false)   // старое демо из 4 вопросов
  })
})
