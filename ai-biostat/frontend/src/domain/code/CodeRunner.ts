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

/**
 * ok — код выполнился и анализирует то, что нужно (засчитывается);
 * runtime — ошибка при выполнении (error — сообщение R/Python);
 * wrong — код выполнился, но не тот анализ (не те переменные / не тот метод);
 * timeout — слишком долго, выполнение остановлено.
 * simulated — настоящий R/Python не загрузился, показан заранее посчитанный результат.
 */
export type RunResult =
  | { ok: true; output: string; simulated?: boolean }
  | { ok: false; kind: 'runtime' | 'wrong' | 'timeout'; error: string; output?: string; simulated?: boolean }

/** Этапы: подготовка данных, выполнение кода, формирование результата (подписи — step6.stages). */
export const RUN_STAGE_COUNT = 3

/** Дополнительные сведения для экрана во время запуска (первая загрузка языка может идти до минуты). */
export type RunInfo = 'loading' | null

/**
 * Исполнитель кода шага 6. Экран зависит только от этого интерфейса,
 * поэтому имитацию можно заменить на Pyodide/WebR без правки экрана (DIP, LSP).
 */
export interface CodeRunner {
  run(req: RunRequest, onStage: (stage: number) => void, onInfo?: (info: RunInfo) => void): Promise<RunResult>
}
