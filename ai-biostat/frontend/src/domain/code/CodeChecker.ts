import { toRegExp } from '@/domain/cases/CaseDefinition'
import type { RunRequest } from './CodeRunner'

/**
 * Что студент написал то, что нужно для вопроса кейса: в шаблоне — верные названия столбцов в пропусках,
 * в свободном коде специалиста — обязательные элементы (метод, переменные). Общая проверка для имитации
 * и для настоящего запуска: успешное выполнение само по себе ещё не значит верный анализ.
 */
export class CodeChecker {
  check({ def, mode, blanks, code }: Pick<RunRequest, 'def' | 'mode' | 'blanks' | 'code'>): boolean {
    if (mode === 'free') return def.code.freeRequired.every(p => toRegExp(p).test(code))
    const clean = blanks.map(b => b.replace(/["']/g, '').trim())
    return def.code.blankAnswers.every(a => clean.includes(a))
  }
}

/** Код для запуска: шаблон с подставленными пропусками ([0], [1] …) или свободный код специалиста. */
export function assembleSource({ def, lang, mode, blanks, code }: RunRequest): string {
  if (mode === 'free') return code
  return def.code.templates[lang]
    .map(line => line.replace(/\[(\d)\]/g, (_, i) => (blanks[Number(i)] ?? '').replace(/["']/g, '').trim()))
    .join('\n')
}
