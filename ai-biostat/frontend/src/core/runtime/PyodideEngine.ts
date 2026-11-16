import type { CodeEngine, EngineFile, EngineResult } from '@/domain/code/BrowserCodeRunner'

type Reply = { id: number; ok: boolean; output: string; error?: string }

/** Python через Pyodide в Web Worker. Зависший код останавливается по таймауту (поток пересоздаётся). */
export class PyodideEngine implements CodeEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private seq = 0
  loaded = false

  private spawn(): Worker {
    this.worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
    return this.worker
  }

  private call(msg: object, timeoutMs: number): Promise<Reply & { timeout?: boolean }> {
    const w = this.worker ?? this.spawn()
    const id = ++this.seq
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        w.removeEventListener('message', onMsg)
        w.terminate(); this.worker = null; this.ready = null; this.loaded = false
        resolve({ id, ok: false, output: '', timeout: true })
      }, timeoutMs)
      const onMsg = (e: MessageEvent<Reply>) => {
        if (e.data.id !== id) return
        clearTimeout(timer); w.removeEventListener('message', onMsg); resolve(e.data)
      }
      w.addEventListener('message', onMsg)
      w.postMessage({ id, ...msg })
    })
  }

  load(): Promise<void> {
    this.ready ??= this.call({ type: 'load' }, 180_000).then(r => {
      if (!r.ok) { this.ready = null; throw new Error(r.error || 'Pyodide не загрузился') }
      this.loaded = true
    })
    return this.ready
  }

  async run(source: string, files: EngineFile[], timeoutMs: number): Promise<EngineResult> {
    await this.load()
    const r = await this.call({ type: 'run', source, files }, timeoutMs)
    return { ok: r.ok, output: r.output, error: r.error, timeout: r.timeout }
  }
}
