import { toRegExp } from '@/domain/cases/CaseDefinition'
import { RUN_STAGES, type CodeRunner, type RunRequest, type RunResult } from './CodeRunner'

/** Имитация запуска (этап 1): проверяет ключевые элементы кода и выдаёт заранее посчитанный результат. */
export class SimulatedCodeRunner implements CodeRunner {
  constructor(private stageDelayMs = 550) {}

  async run(req: RunRequest, onStage: (stage: number) => void): Promise<RunResult> {
    const ok = this.check(req)
    for (let i = 0; i < RUN_STAGES.length; i++) {
      onStage(i)
      await new Promise(r => setTimeout(r, this.stageDelayMs))
    }
    return ok
      ? { ok: true, output: req.def.code.outputs[req.lang] }
      : { ok: false, error: req.def.code.errors[req.lang] }
  }

  check({ def, mode, blanks, code }: RunRequest): boolean {
    if (mode === 'free') return def.code.freeRequired.every(p => toRegExp(p).test(code))
    const clean = blanks.map(b => b.replace(/["']/g, ''))
    return def.code.blankAnswers.every(a => clean.includes(a))
  }
}
