import { describe, expect, it } from 'vitest'
import { defaultCaseRegistry } from '@/cases/CaseRegistry'
import { applyEdits, editableFields, getText } from './cases/CaseEdits'
import { CaseScorer } from './scoring/CaseScorer'
import { newCaseProgress } from './progress/types'

describe('редактор кейсов: правки текстов', () => {
  it.each(['1', '4', '21', '22', '23'])('кейс %s: все поля существуют и уникальны, ✓ и ⚠ отмечены', id => {
    const def = defaultCaseRegistry().original(id, 'kk')!
    const fields = editableFields(def)
    expect(new Set(fields.map(f => f.path)).size).toBe(fields.length)
    fields.forEach(f => expect(getText(def, f.path), f.path).not.toBe(''))
    expect(fields.filter(f => f.flag === 'correct').map(f => f.path)).toEqual([`method.options.${def.method.correct}`])
    expect(fields.filter(f => f.flag === 'trap').map(f => f.path)).toEqual([`aiTrap.fragments.${def.aiTrap.wrongIndex}`])
  })

  it('меняется только нужный текст; запрещённые пути и пустые тексты игнорируются; исходник не тронут', () => {
    const def = defaultCaseRegistry().original('21', 'ru')!
    const edited = applyEdits(def, {
      'situation.paragraphs.0': 'Новый абзац',
      'method.options.2': 'χ²-критерий (исправлено)',
      'method.correct': '0',                         // не текст — не применяется
      'aiTrap.explanation.source': '.*',             // шаблон проверки — не применяется
      'debrief.aiRepeat': '   ',                     // пустой — не применяется
    })
    expect(edited.situation.paragraphs[0]).toBe('Новый абзац')
    expect(edited.method.options[2]).toBe('χ²-критерий (исправлено)')
    expect(edited.method.correct).toBe(2)
    expect(edited.aiTrap.explanation).toEqual(def.aiTrap.explanation)
    expect(edited.debrief.aiRepeat).toBe(def.debrief.aiRepeat)
    expect(def.situation.paragraphs[0]).not.toBe('Новый абзац')
    expect(edited.data.csv!()).toBe(def.data.csv!())
  })

  it('реестр отдаёт кейс с правками нужного языка, исходник — без; баллы не меняются', () => {
    const reg = defaultCaseRegistry()
    reg.setEdits({ '21': { kk: { 'method.question': 'ӨЗГЕРТІЛГЕН СҰРАҚ' } } })
    expect(reg.get('21', 'kk')!.method.question).toBe('ӨЗГЕРТІЛГЕН СҰРАҚ')
    expect(reg.get('21', 'ru')!.method.question).not.toBe('ӨЗГЕРТІЛГЕН СҰРАҚ')
    expect(reg.original('21', 'kk')!.method.question).not.toBe('ӨЗГЕРТІЛГЕН СҰРАҚ')
    expect(reg.editsFor('21', 'kk')).toEqual({ 'method.question': 'ӨЗГЕРТІЛГЕН СҰРАҚ' })
    const p = { ...newCaseProgress(), m: { choice: 2, tries: 1, ok: true, hint: false }, ran: true, frag: 2, fix: 'бақылаулық деректерден себеп-салдарлық қорытынды' }
    const s = new CaseScorer()
    expect(s.score(reg.get('21', 'kk')!, p, 'pre').total).toBe(s.score(reg.original('21', 'kk')!, p, 'pre').total)
    reg.setEdits({})
    expect(reg.get('21', 'kk')!.method.question).toBe(reg.original('21', 'kk')!.method.question)
  })
})
