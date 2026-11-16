import type { CodeLang } from '@/domain/progress/types'
import { CodeChecker, assembleSource } from './CodeChecker'
import type { CodeRunner, RunInfo, RunRequest, RunResult } from './CodeRunner'

/** Файл, который кладётся рядом с кодом (данные кейса). */
export interface EngineFile { name: string; content: string }

export interface EngineResult {
  ok: boolean
  output: string
  error?: string
  timeout?: boolean
}

/**
 * Язык, выполняющийся в браузере (Pyodide — Python, WebR — R). Реализации — core/runtime;
 * домен знает только этот интерфейс (DIP), поэтому их легко подменить в тестах.
 */
export interface CodeEngine {
  readonly loaded: boolean
  load(): Promise<void>
  run(source: string, files: EngineFile[], timeoutMs: number): Promise<EngineResult>
}

/** с запасом: первый запуск R доустанавливает пакеты */
export const RUN_TIMEOUT_MS = 120_000

/** Последняя содержательная строка сообщения об ошибке (без длинной трассировки Python). */
export function shortError(message: string): string {
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean)
  const err = [...lines].reverse().find(l => /^[A-Za-z_.]*(Error|Exception|Warning)\b|^Error\b/.test(l))
  return (err ?? lines[lines.length - 1] ?? message).slice(0, 400)
}

/**
 * Настоящий запуск: код студента (шаблон с пропусками или свой) выполняется в браузере на исправленных
 * данных кейса. Засчитывается, только если код выполнился И анализирует нужное (CodeChecker).
 * Если язык не загрузился (нет сети, старый браузер) — запасной вариант: имитация с пометкой.
 */
export class BrowserCodeRunner implements CodeRunner {
  constructor(
    private engines: Record<CodeLang, CodeEngine>,
    private fallback: CodeRunner,
    private checker = new CodeChecker(),
  ) {}

  async run(req: RunRequest, onStage: (stage: number) => void, onInfo: (info: RunInfo) => void = () => {}): Promise<RunResult> {
    const engine = this.engines[req.lang]
    const csv = req.def.data.csv?.()
    onStage(0)
    if (!csv) return this.fallback.run(req, onStage, onInfo)
    if (!engine.loaded) {
      onInfo('loading')
      try { await engine.load() } catch { onInfo(null); return this.fallback.run(req, onStage, onInfo) }
      onInfo(null)
    }
    onStage(1)
    const res = await engine.run(assembleSource(req), [{ name: req.def.data.fileName, content: csv }], RUN_TIMEOUT_MS)
    onStage(2)
    if (res.timeout) return { ok: false, kind: 'timeout', error: '', output: res.output }
    if (!res.ok) return { ok: false, kind: 'runtime', error: shortError(res.error ?? ''), output: res.output }
    if (!this.checker.check(req)) return { ok: false, kind: 'wrong', error: '', output: res.output }
    return { ok: true, output: res.output.trimEnd() }
  }
}
