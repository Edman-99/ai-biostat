import type { CaseDefinition } from './CaseDefinition'

/**
 * Правки текстов кейса из редактора преподавателя: путь поля → новый текст (например, "method.options.2").
 * Менять можно только тексты (editableFields). Данные, код, правильные ответы и шаблоны проверки — нет,
 * поэтому правка не может сломать подсчёт баллов.
 */
export type CaseTextEdits = Record<string, string>
/** все правки: кейс → язык → правки */
export type AllCaseEdits = Record<string, Partial<Record<string, CaseTextEdits>>>

export type EditSection = 'step1' | 'step2' | 'step3' | 'step5' | 'step6' | 'step7' | 'step8' | 'step9' | 'tutor'

export interface EditableField {
  path: string
  section: EditSection
  /** ключ подписи: teacher.editor.f.<kind>; params — номер варианта, строки и т. п. */
  kind: string
  params?: Record<string, string | number>
  multiline: boolean
  /** пометка для автора: правильный вариант метода / ошибочный фрагмент ИИ — смысл менять нельзя */
  flag?: 'correct' | 'trap'
}

const DEBRIEF_KEYS = ['referenceConclusion', 'typesRepeat', 'methodSecondTryRepeat', 'methodFailedRepeat', 'aiFound', 'aiMissed', 'aiRepeat'] as const

/** Все редактируемые поля кейса в порядке шагов. */
export function editableFields(def: CaseDefinition): EditableField[] {
  const f: EditableField[] = []
  const add = (path: string, section: EditSection, kind: string, multiline: boolean, params?: EditableField['params'], flag?: EditableField['flag']) =>
    f.push({ path, section, kind, multiline, params, flag })

  def.situation.paragraphs.forEach((_, i) => add(`situation.paragraphs.${i}`, 'step1', 'paragraph', true, { n: i + 1 }))
  add('situation.goal', 'step1', 'goal', true)
  Object.keys(def.data.errors).forEach(row => add(`data.errors.${row}`, 'step2', 'dataError', false, { row }))
  add('data.retryHint', 'step2', 'retryHint', true)
  add('data.allFoundNote', 'step2', 'allFoundNote', true)
  def.variables.forEach((v, i) => add(`variables.${i}.label`, 'step3', 'variable', false, { name: v.key }))
  add('method.question', 'step5', 'methodQuestion', true)
  def.method.options.forEach((_, i) => add(`method.options.${i}`, 'step5', 'option', false, { n: i + 1 }, i === def.method.correct ? 'correct' : undefined))
  add('method.retryHint', 'step5', 'retryHint', true)
  add('method.failNote', 'step5', 'failNote', true)
  add('code.chart.title', 'step6', 'chartTitle', false)
  def.interpretation.checklist.forEach((_, i) => add(`interpretation.checklist.${i}.label`, 'step7', 'rubricItem', false, { n: i + 1 }))
  def.aiTrap.fragments.forEach((_, i) => add(`aiTrap.fragments.${i}`, 'step8', 'fragment', true, { n: i + 1 }, i === def.aiTrap.wrongIndex ? 'trap' : undefined))
  DEBRIEF_KEYS.forEach(k => add(`debrief.${k}`, 'step9', k, k === 'referenceConclusion'))
  def.debrief.disputeSteps.forEach((_, i) => add(`debrief.disputeSteps.${i}`, 'step9', 'disputeStep', false, { n: i + 1 }))
  Object.entries(def.tutor.quick).forEach(([step, qs]) =>
    qs.forEach((_, i) => add(`tutor.quick.${step}.${i}`, 'tutor', 'tutorQuestion', false, { step, n: i + 1 })))
  return f
}

/** Значение поля по пути ("method.options.2"). */
export function getText(def: CaseDefinition, path: string): string {
  let cur: unknown = def
  for (const key of path.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[key]
  return typeof cur === 'string' ? cur : ''
}

/** Кейс с наложенными правками. Пути, которых нет среди editableFields, и пустые тексты игнорируются. */
export function applyEdits(def: CaseDefinition, edits: CaseTextEdits | undefined): CaseDefinition {
  if (!edits || !Object.keys(edits).length) return def
  const allowed = new Set(editableFields(def).map(f => f.path))
  const copy = structuredClone({ ...def, data: { ...def.data, csv: undefined } }) as CaseDefinition
  copy.data.csv = def.data.csv                    // функцию не клонировать
  for (const [path, text] of Object.entries(edits)) {
    if (!allowed.has(path) || !text.trim()) continue
    const keys = path.split('.')
    let obj = copy as unknown as Record<string, unknown>
    keys.slice(0, -1).forEach(k => { obj = obj[k] as Record<string, unknown> })
    obj[keys[keys.length - 1]] = text
  }
  return copy
}
