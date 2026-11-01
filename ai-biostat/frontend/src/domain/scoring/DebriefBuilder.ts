import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CaseProgress } from '@/domain/progress/types'
import type { ScoreSheet } from './CaseScorer'

/** Пункт дебрифинга: общий — ключ перевода (debrief.<key>), специфичный для кейса — текст из описания кейса. */
export type DebriefItem = { key: string } | { text: string }

export interface Debrief {
  good: DebriefItem[]
  bad: DebriefItem[]
  repeat: DebriefItem[]
}

/** Три колонки дебрифинга: «Получилось», «Ошибки», «Повторить». */
export class DebriefBuilder {
  build(def: CaseDefinition, p: CaseProgress, sheet: ScoreSheet): Debrief {
    const s = sheet.byKey, d = def.debrief
    const good: DebriefItem[] = [], bad: DebriefItem[] = [], repeat: DebriefItem[] = []

    if (s.data >= 10) good.push({ key: 'dataAll' })
    else bad.push({ key: 'dataSome' })

    if (s.types >= 9) good.push({ key: 'typesOk' })
    else { bad.push({ key: 'typesBad' }); repeat.push({ text: d.typesRepeat }) }

    if (s.method === 20) good.push({ key: 'method1' })
    else if (s.method === 15) { good.push({ key: 'method2' }); repeat.push({ text: d.methodSecondTryRepeat }) }
    else { bad.push({ key: 'methodFail' }); repeat.push({ text: d.methodFailedRepeat }) }

    if (p.shown) bad.push({ key: 'codeShown' })
    else if (p.ran) good.push({ key: 'codeSelf' })

    if (s.interp < 25) { bad.push({ key: 'interpMissing' }); repeat.push({ key: 'interpRepeat' }) }

    if (p.frag === def.aiTrap.wrongIndex) good.push({ text: d.aiFound })
    else { bad.push({ text: d.aiMissed }); repeat.push({ text: d.aiRepeat }) }

    return { good, bad, repeat }
  }
}
