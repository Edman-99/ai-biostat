import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CaseProgress } from '@/domain/progress/types'
import type { ScoreSheet } from './CaseScorer'

export interface Debrief {
  good: string[]
  bad: string[]
  repeat: string[]
}

/** Три колонки дебрифинга: «Получилось», «Ошибки», «Повторить». */
export class DebriefBuilder {
  build(def: CaseDefinition, p: CaseProgress, sheet: ScoreSheet): Debrief {
    const s = sheet.byKey, d = def.debrief
    const good: string[] = [], bad: string[] = [], repeat: string[] = []

    if (s.data >= 10) good.push('Найдены все ошибки в данных')
    else bad.push('Найдены не все ошибки в данных')

    if (s.types >= 9) good.push('Типы переменных определены верно')
    else { bad.push('Есть неточности в типах переменных'); repeat.push(d.typesRepeat) }

    if (s.method === 20) good.push('Метод выбран с первой попытки')
    else if (s.method === 15) { good.push('Метод выбран со второй попытки'); repeat.push(d.methodSecondTryRepeat) }
    else { bad.push('Метод не выбран'); repeat.push(d.methodFailedRepeat) }

    if (p.shown) bad.push('Использован готовый код')
    else if (p.ran) good.push('Код выполнен самостоятельно')

    if (s.interp < 25) { bad.push('В выводе не хватает обязательных элементов'); repeat.push('Структура статистического вывода') }

    if (p.frag === def.aiTrap.wrongIndex) good.push(d.aiFound)
    else { bad.push(d.aiMissed); repeat.push(d.aiRepeat) }

    return { good, bad, repeat }
  }
}
