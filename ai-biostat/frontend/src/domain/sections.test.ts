import { describe, expect, it } from 'vitest'
import { parseCsv } from './analysis/Dataset'
import { describe as summarize, describeNumeric, isNumericColumn, quantile } from './analysis/Descriptives'
import { codeFor } from './analysis/CodeTemplates'
import { AiCheckEvaluator, AI_CHECK_TASKS } from './aicheck/AiCheckTrainer'
import { competenciesFromCases, stepSuccess, weakestSteps } from './progress/Competencies'
import { GroupAnalytics } from './analytics/GroupAnalytics'
import { CaseScorer } from './scoring/CaseScorer'
import { defaultCaseRegistry } from '@/cases/CaseRegistry'
import { newCaseProgress } from './progress/types'
import type { AnalyticsData } from '@/api/types'

describe('анализ: CSV и описательная статистика', () => {
  it('читает «;» с десятичной запятой и кавычками', () => {
    const ds = parseCsv('﻿Возраст;ИМТ;Комментарий\n48;31,2;"да; курит"\n39;24,8;нет\n', 'a.csv')
    expect(ds.delimiter).toBe(';')
    expect(ds.columns).toEqual(['Возраст', 'ИМТ', 'Комментарий'])
    expect(ds.rows[0]['Комментарий']).toBe('да; курит')
    expect(describeNumeric(ds.rows.map(r => r['ИМТ'])).mean).toBeCloseTo(28, 6)
  })

  it('квантили как в R (type 7) и pandas', () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(quantile(s, 0.25)).toBeCloseTo(3.25)
    expect(quantile(s, 0.5)).toBeCloseTo(5.5)
    expect(quantile(s, 0.75)).toBeCloseTo(7.75)
  })

  it('SD выборочное (n−1), пропуски считаются отдельно', () => {
    const r = describeNumeric(['2', '4', '4', '4', '5', '5', '7', '9', '', 'NA'])
    expect(r.n).toBe(8)
    expect(r.missing).toBe(2)
    expect(r.mean).toBe(5)
    expect(r.sd).toBeCloseTo(2.13809, 4)
    expect([r.min, r.max]).toEqual([2, 9])
  })

  it('0/1 и шкала 1–5 — категориальные, возраст — количественная', () => {
    expect(isNumericColumn(['0', '1', '1', '0'])).toBe(false)
    expect(isNumericColumn(['23', '45', '31', '60', '52', '38'])).toBe(true)
    expect(isNumericColumn(['М', 'Ж'])).toBe(false)
  })

  it('таблица частот и код R/Python', () => {
    const ds = parseCsv('sex,age\nМ,20\nЖ,30\nЖ,40\n,50\n', 'd.csv')
    const s = summarize(ds, 'sex')
    expect(s.kind).toBe('categorical')
    if (s.kind !== 'categorical') return
    expect(s.levels[0]).toEqual({ value: 'Ж', n: 2, pct: (2 / 3) * 100 })
    expect(s.missing).toBe(1)
    const code = codeFor(ds, 'sex', s)
    expect(code.python).toContain('value_counts')
    expect(code.r).toContain('table(x)')
    expect(code.r).toContain('read.csv("d.csv")')
  })
})

describe('тренажёр «Проверка ИИ»', () => {
  const ev = new AiCheckEvaluator()
  const [t1, t2, t3] = AI_CHECK_TASKS
  it('неверная оценка, короткое и слабое обоснование', () => {
    expect(ev.evaluate(t1, 'right', 'что угодно')).toBe('wrongVerdict')
    expect(ev.evaluate(t1, 'wrong', 'нужен другой метод')).toBe('tooShort')
    expect(ev.evaluate(t1, 'wrong', 'я думаю что здесь нужен совсем другой метод анализа')).toBe('weakReason')
  })
  it('засчитывает обоснование на русском, казахском и английском', () => {
    expect(ev.evaluate(t1, 'wrong', 'Исход бинарный — доля осложнений, поэтому нужен хи-квадрат, а не t-критерий')).toBe('ok')
    expect(ev.evaluate(t2, 'right', 'При асимметрии среднее смещается хвостом, медиана устойчива к выбросам')).toBe('ok')
    expect(ev.evaluate(t3, 'unknown', 'Without the sample size and a p-value we cannot judge significance here')).toBe('ok')
    expect(ev.evaluate(t3, 'unknown', 'Нет объёма выборки и p, а также не указан 95% ДИ для коэффициента')).toBe('ok')
  })
  it('процент решённых', () => {
    expect(ev.successPct({})).toBeNull()
    expect(ev.successPct({ t1: { verdict: 'wrong', reason: '', ok: true, tries: 1 } })).toBe(33)
  })
})

describe('компетенции и аналитика группы', () => {
  const registry = defaultCaseRegistry()
  const def = registry.get('21')!
  const scorer = new CaseScorer()
  const perfect = {
    ...newCaseProgress(), step: 10, maxStep: 10, flags: [4, 9, 13],
    types: { id: 'id', age: 'q', sex: 'n', emp: 'n', vl: 'q', sup: 'b' }, outcome: 'sup',
    question: 'Связана ли занятость с подавлением вирусной нагрузки у пациентов', m: { choice: 2, tries: 1, ok: true, hint: false },
    ran: true, interp: 'Доля 94% у работающих по найму, χ² = 11,1, p = 0,004; домохозяйки ниже; связь наблюдательная, не причина. ' + 'слово '.repeat(40),
    frag: 2, fix: 'это причинный вывод из наблюдательных данных',
  }
  const weak = { ...newCaseProgress(), step: 10, maxStep: 10 }

  it('из баллов кейса — проценты по компетенциям', () => {
    const sheet = scorer.score(def, perfect, 'pre')
    expect(sheet.total).toBe(100)
    expect(competenciesFromCases([sheet])).toEqual({ 'Биостатистика': 100, 'Работа с данными': 100, 'Интерпретация': 100, 'Работа с ИИ': 100 })
    expect(competenciesFromCases([])).toBeNull()
  })

  it('слабые шаги — по возрастанию, не больше трёх', () => {
    const steps = stepSuccess([scorer.score(def, perfect, 'pre'), scorer.score(def, weak, 'pre')])
    expect(steps.map(s => s.key)).toEqual(['data', 'types', 'question', 'method', 'code', 'interp', 'ai'])
    expect(weakestSteps(steps).length).toBe(3)
  })

  it('сводка по группе: фильтр группы, диагностика, тренажёр', () => {
    const NOW = 1_800_000_000
    const data: AnalyticsData = {
      people: [
        { code: 'P-1', role: 'student', grp: 'A', last_active: NOW - 3600 },
        { code: 'P-2', role: 'student', grp: 'A', last_active: NOW - 8 * 24 * 3600 },
        { code: 'P-3', role: 'student', grp: 'ТЕСТ', last_active: NOW },
      ],
      attempts: [
        { code: 'P-1', case_id: '21', status: 'completed', score: 100, max_step: 10, progress: perfect },
        { code: 'P-2', case_id: '21', status: 'in_progress', score: null, max_step: 4, progress: null },
        { code: 'P-3', case_id: '21', status: 'completed', score: 10, max_step: 10, progress: weak },
      ],
      diagnostics: { 'P-1': { 'Биостатистика': 72 }, 'P-2': { 'Биостатистика': 41 } },
      trainer: { 'P-1': { t1: { verdict: 'wrong', reason: '', ok: true, tries: 1 } } },
    }
    const ga = new GroupAnalytics(registry, scorer, new AiCheckEvaluator())
    expect(ga.groups(data)).toEqual(['A', 'ТЕСТ'])
    const r = ga.report(data, 'A', NOW)
    expect(r.participants).toBe(2)
    expect(r.active7).toBe(1)
    expect(r.started).toBe(2)
    expect(r.completed).toBe(1)
    expect(r.avgScore).toBe(100)
    expect(r.competencies.find(c => c.block === 'Биостатистика')).toEqual({ block: 'Биостатистика', entry: 57, cases: 100 })
    expect(r.trainerPct).toBe(33)
    expect(ga.report(data, null).avgScore).toBe(55)
  })
})
