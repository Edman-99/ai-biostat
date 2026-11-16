import { CodeChecker } from './CodeChecker'
import { RUN_STAGE_COUNT, type CodeRunner, type RunRequest, type RunResult } from './CodeRunner'

/** Имитация запуска: проверяет ключевые элементы кода и выдаёт заранее посчитанный результат. Запасной вариант. */
export class SimulatedCodeRunner implements CodeRunner {
  constructor(private stageDelayMs = 550, private checker = new CodeChecker()) {}

  async run(req: RunRequest, onStage: (stage: number) => void): Promise<RunResult> {
    const ok = this.check(req)
    for (let i = 0; i < RUN_STAGE_COUNT; i++) {
      onStage(i)
      await new Promise(r => setTimeout(r, this.stageDelayMs))
    }
    return ok
      ? { ok: true, output: req.def.code.outputs[req.lang], simulated: true }
      : { ok: false, kind: 'runtime', error: req.def.code.errors[req.lang], simulated: true }
  }

  check(req: RunRequest): boolean { return this.checker.check(req) }
}
