import { describe, expect, it } from 'vitest'
import { LEARNER_SURVEY, TEACHER_SURVEY, missingKeys, requiredKeys } from './survey/Survey'

describe('опросник обратной связи', () => {
  it.each([['студенты', LEARNER_SURVEY], ['преподаватели', TEACHER_SURVEY]] as const)('%s: SUS из 10, коды уникальны и подходят серверу, три языка', (_, s) => {
    const items = s.flatMap(x => x.items)
    expect(items.filter(i => i.kind === 'scale').map(i => i.id)).toEqual(Array.from({ length: 10 }, (_, k) => `sus${k + 1}`))
    expect(new Set(items.map(i => i.id)).size).toBe(items.length)
    requiredKeys(s).concat(items.map(i => i.id)).forEach(k => expect(k).toMatch(/^[a-z][a-z0-9_]{0,39}$/))
    items.forEach(i => { expect(i.text.ru && i.text.kk && i.text.en).toBeTruthy(); expect(i.text.kk).not.toBe(i.text.en) })
  })

  it('обязательные ответы: до/сейчас — по два, открытые — нет', () => {
    const req = requiredKeys(LEARNER_SURVEY)
    expect(req).toContain('self_method_before'); expect(req).toContain('self_method_now')
    expect(req).not.toContain('open_liked')
    const all = Object.fromEntries(req.map(k => [k, 3]))
    expect(missingKeys(LEARNER_SURVEY, all)).toEqual([])
    expect(missingKeys(LEARNER_SURVEY, { ...all, fa12: 0 })).toEqual([])                // «Нет» (0) — это ответ
    expect(req.filter(k => /^fa\d+$/.test(k)).length).toBe(12)
    expect(req.filter(k => /^fb\d+$/.test(k)).length).toBe(12)
    expect(missingKeys(LEARNER_SURVEY, { sus1: 5 }).length).toBe(req.length - 1)
  })
})
