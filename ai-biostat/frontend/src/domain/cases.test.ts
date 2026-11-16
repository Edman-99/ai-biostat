import { describe, expect, it } from 'vitest'
import { defaultCaseRegistry } from '@/cases/CaseRegistry'
import { generateCase01Rows } from '@/cases/case01/case01'
import { generateCase04Rows } from '@/cases/case04/case04'
import { generateCase22Rows } from '@/cases/case22/case22'
import { generateCase23Rows } from '@/cases/case23/case23'
import { toRegExp } from './cases/CaseDefinition'
import { CaseScorer } from './scoring/CaseScorer'
import { newCaseProgress, type CaseProgress } from './progress/types'
import { SimulatedCodeRunner } from './code/SimulatedCodeRunner'

const registry = defaultCaseRegistry()
const LANGS = ['ru', 'kk', 'en'] as const
const IDS = ['1', '4', '21', '22', '23']
const scorer = new CaseScorer()

describe('все кейсы пилота', () => {
  it('наполнены все 5 кейсов каталога', () => {
    expect(registry.ids().sort()).toEqual([...IDS].sort())
  })

  it.each(IDS.flatMap(id => LANGS.map(l => [id, l] as const)))('кейс %s (%s): данные, структура, языки', (id, lang) => {
    const d = registry.get(id, lang)!
    const ru = registry.get(id, 'ru')!
    expect(d.data.preview.length).toBe(15)
    Object.keys(d.data.errors).forEach(k => expect(Number(k)).toBeLessThanOrEqual(15))
    expect(Object.keys(d.data.errors)).toEqual(Object.keys(ru.data.errors))
    expect(Object.keys(d.data.preview[0])).toEqual(d.data.columns)
    expect(d.method.options.length).toBe(ru.method.options.length)
    expect(d.method.correct).toBe(ru.method.correct)
    expect(d.variables.map(v => v.key)).toEqual(ru.variables.map(v => v.key))
    expect(d.variables.some(v => v.key === d.outcome)).toBe(true)
    expect(d.aiTrap.fragments.length).toBe(4)
    expect(d.debrief.disputeSteps.length).toBe(3)
    if (lang !== 'ru') expect(d.situation.paragraphs[0]).not.toBe(ru.situation.paragraphs[0])
  })

  it.each(IDS.flatMap(id => LANGS.map(l => [id, l] as const)))('кейс %s (%s): эталонный вывод проходит всю рубрику, разбор ловушки ИИ засчитывается', (id, lang) => {
    const d = registry.get(id, lang)!
    d.interpretation.checklist.forEach(c =>
      expect(toRegExp(c.pattern).test(d.debrief.referenceConclusion), `${c.label}`).toBe(true))
    expect(toRegExp(d.aiTrap.explanation).test(d.debrief.aiMissed)).toBe(true)
  })

  it.each(IDS)('кейс %s: идеальное прохождение = 100 баллов на любом языке', id => {
    const d = registry.get(id, 'ru')!
    const types = Object.fromEntries(d.variables.map(v => [v.key, v.expected]))
    LANGS.forEach(lang => {
      const L = registry.get(id, lang)!
      const p: CaseProgress = {
        ...newCaseProgress(), step: 10, maxStep: 10,
        flags: Object.keys(d.data.errors).map(Number), types, outcome: d.outcome,
        question: 'Связана ли переменная воздействия с исходом у пациентов исследования',
        m: { choice: d.method.correct, tries: 1, ok: true, hint: false }, ran: true,
        interp: `${L.debrief.referenceConclusion} ${'слово '.repeat(60)}`, frag: d.aiTrap.wrongIndex, fix: L.debrief.aiMissed,
      }
      expect(scorer.score(L, p, 'post').total).toBe(100)
    })
  })

  it.each(IDS)('кейс %s: шаблон кода с правильными пропусками «выполняется»', async id => {
    const d = registry.get(id, 'kk')!
    const runner = new SimulatedCodeRunner(0)
    for (const lang of ['R', 'Python'] as const) {
      expect(d.code.templates[lang].join('\n')).toMatch(/\[0\]/)
      const ok = await runner.run({ def: d, lang, mode: 'template', blanks: [...d.code.blankAnswers], code: '' }, () => {})
      expect(ok.ok).toBe(true)
      const bad = await runner.run({ def: d, lang, mode: 'template', blanks: ['x', 'y'], code: '' }, () => {})
      expect(bad.ok).toBe(false)
    }
  })
})

describe('синтетические данные совпадают с эталонными таблицами', () => {
  const count = <T>(rows: T[], f: (r: T) => boolean) => rows.filter(f).length

  it('кейс 1: 64 события, доли целей 48 и 36 (до «грязи» — не затронута)', () => {
    const r = generateCase01Rows()
    expect(r.length).toBe(64)
    expect(count(r, x => x.notify_ok === 1)).toBe(48)
    expect(count(r, x => x.respond_ok === 1)).toBe(36)
    expect(count(r, x => x.notify_ok === 1 && x.respond_ok === 0)).toBe(18)
    expect(count(r, x => x.notify_ok === 0 && x.respond_ok === 1)).toBe(6)
  })

  it('кейс 4: 60 случаев и 120 контролей', () => {
    const r = generateCase04Rows()
    expect(r.length).toBe(180)
    expect(count(r, x => x.sepsis === 1)).toBe(60)
    expect(r[11].prom18).toBe(3)                     // «грязь»; без неё воздействие 24 и 22
    const clean = r.filter((_, i) => i !== 11)
    expect(count(clean, x => x.sepsis === 1 && x.prom18 === 1) + count(clean, x => x.sepsis === 0 && x.prom18 === 1)).toBeGreaterThanOrEqual(45)
  })

  it('кейс 23: 170 без пропусков, 70 с пропусками; супрессия 150 и 46', () => {
    const r = generateCase23Rows()
    expect(r.length).toBe(240)
    expect(count(r, x => x.vl_suppressed === 1)).toBe(196)
  })

  it('кейс 22: стадии 80/90/80/50, супрессия 225', () => {
    const r = generateCase22Rows()
    expect(r.length).toBe(300)
    expect(count(r, x => x.vl_suppressed === 1)).toBe(225)
    expect(count(r, x => x.stage === 4)).toBe(50)
    expect(r[1].stage).toBe(5)
  })
})

describe('ловушка ИИ не засчитывается за пустое согласие', () => {
  const lazy = ['Я согласен с ИИ, здесь всё верно и хорошо написано.', 'Мен ЖИ-мен келісемін, бәрі дұрыс жазылған.', 'I agree with the AI, everything here is correct and well written.']
  it.each(IDS)('кейс %s', id => {
    const re = toRegExp(registry.get(id, 'ru')!.aiTrap.explanation)
    lazy.forEach(t => expect(re.test(t), t).toBe(false))
  })
})
