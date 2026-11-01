import { describe, expect, it } from 'vitest'
import { case21 } from '@/cases/case21/case21'
import { generateCase21Rows } from '@/cases/case21/data'
import { GradeScale } from './grading/GradeScale'
import { CaseScorer } from './scoring/CaseScorer'
import { DebriefBuilder } from './scoring/DebriefBuilder'
import { SimulatedCodeRunner } from './code/SimulatedCodeRunner'
import { newCaseProgress, type CaseProgress } from './progress/types'

const perfect = (): CaseProgress => ({
  ...newCaseProgress(),
  step: 10, maxStep: 10, locked: true,
  flags: [4, 9, 13],
  types: { id: 'id', age: 'q', sex: 'n', emp: 'n', vl: 'q', sup: 'b' },
  outcome: 'sup',
  question: 'Связана ли занятость пациента с подавлением вирусной нагрузки на АРТ?',
  m: { choice: 2, tries: 1, ok: true, hint: false, why: 'обе переменные категориальные сравниваем частоты' },
  ran: true,
  interp: 'Доля подавления 94% у работающих по найму, ниже у домохозяек; χ² = 11,1, p = 0,004. Связь наблюдательная, не доказывает причину. '
    + 'слово '.repeat(40),
  frag: 2,
  fix: 'Это причинный вывод из наблюдательных данных, связь не означает причинность',
})

describe('данные кейса 21', () => {
  it('ошибки для шага 2 стоят в строках 4, 9, 13', () => {
    const rows = generateCase21Rows()
    expect(rows).toHaveLength(377)
    expect(rows[3].age).toBe(230)
    expect(rows[8].vl).toBe(-35)
    expect(rows[12].sex).toBe('M (лат.)')
  })

  it('доли подавления по группам — как в публикации', () => {
    const rows = generateCase21Rows()
    const share = (emp: string) => {
      const g = rows.filter(r => r.emp === emp)
      return Math.round(g.filter(r => r.sup === 'Да').length / g.length * 1000) / 10
    }
    expect(share('Работающие по найму')).toBe(94)
    expect(share('Самозанятые')).toBe(83.9)
    expect(share('Домохозяйки')).toBe(76.9)
  })
})

describe('баллы', () => {
  const scorer = new CaseScorer()

  it('идеальное прохождение = 100', () => {
    expect(scorer.score(case21, perfect(), 'pre').total).toBe(100)
  })

  it('штрафы: вторая попытка метода −5, готовый код −5', () => {
    const p = { ...perfect(), m: { ...perfect().m, tries: 2 }, shown: true }
    expect(scorer.score(case21, p, 'pre').total).toBe(90)
  })

  it('лишняя отметка в данных −2', () => {
    const p = { ...perfect(), flags: [4, 9, 13, 1] }
    expect(scorer.score(case21, p, 'pre').byKey.data).toBe(8)
  })

  it('бинарная, размеченная как номинальная, засчитывается', () => {
    const p = { ...perfect(), types: { ...perfect().types, sup: 'n' } }
    expect(scorer.score(case21, p, 'pre').byKey.types).toBe(10)
  })

  it('пустой прогресс = 0', () => {
    expect(scorer.score(case21, newCaseProgress(), 'post').total).toBe(0)
  })

  it('специалисту нужно 60 слов в выводе', () => {
    const p = { ...perfect(), interp: 'Доля 94%, χ² = 11,1, p = 0,004, домохозяйки ниже, связь не доказывает причину. ' + 'слово '.repeat(40) }
    expect(scorer.score(case21, p, 'pre').byKey.interp).toBe(25)
    expect(scorer.score(case21, p, 'post').byKey.interp).toBe(20)
  })
})

describe('дебрифинг', () => {
  it('ошибка ИИ не найдена → в «Повторить»', () => {
    const p = { ...perfect(), frag: 0 }
    const d = new DebriefBuilder().build(case21, p, new CaseScorer().score(case21, p, 'pre'))
    expect(d.bad).toContain(case21.debrief.aiMissed)
    expect(d.repeat).toContain('Связь ≠ причинность')
  })
})

describe('шкала оценок', () => {
  const g = new GradeScale()
  it.each([[100, 'A'], [95, 'A'], [94, 'A−'], [85, 'B+'], [60, 'C−'], [50, 'D'], [49, 'FX'], [24, 'F'], [0, 'F']])(
    '%i → %s', (score, letter) => expect(g.gradeOf(score).letter).toBe(letter))
})

describe('имитация запуска кода', () => {
  const runner = new SimulatedCodeRunner(0)
  const base = { def: case21, lang: 'R' as const, code: '' }

  it('шаблон: верные пропуски (в кавычках тоже)', () => {
    expect(runner.check({ ...base, mode: 'template', blanks: ['"employment"', 'vl_suppressed'] })).toBe(true)
    expect(runner.check({ ...base, mode: 'template', blanks: ['employment', 'sex'] })).toBe(false)
  })

  it('свободный код специалиста', async () => {
    const res = await runner.run({ ...base, mode: 'free', blanks: [], code: 'chisq.test(table(d$employment, d$vl_suppressed))' }, () => {})
    expect(res.ok).toBe(true)
  })
})
