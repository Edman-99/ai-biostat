import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CodeLang } from '@/domain/progress/types'

export interface RunRequest {
  def: CaseDefinition
  lang: CodeLang
  /** шаблон с пропусками (студент или после «показать код») или свободный код специалиста */
  mode: 'template' | 'free'
  blanks: string[]
  code: string
}

export type RunResult = { ok: true; output: string } | { ok: false; error: string }

export const RUN_STAGES = ['Подготовка данных', 'Выполняется код', 'Формируется результат']

/**
 * Исполнитель кода шага 6. Экран зависит только от этого интерфейса,
 * поэтому имитацию можно заменить на Pyodide/WebR без правки экрана (DIP, LSP).
 */
export interface CodeRunner {
  run(req: RunRequest, onStage: (stage: number) => void): Promise<RunResult>
}
