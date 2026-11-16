import type { CodeEngine, EngineFile, EngineResult } from '@/domain/code/BrowserCodeRunner'

/**
 * R через WebR (R, собранный в WebAssembly; работает в своём потоке). Грузится с CDN при первом запуске (~20–40 МБ),
 * поэтому R рекомендован на ПК. Пакеты из library(...) доустанавливаются из репозитория WebR (sandwich, lmtest …).
 */
const WEBR_URL = 'https://webr.r-wasm.org/v0.4.2/'
const HOME = '/home/web_user/'

interface Capture { output: { type: string; data: unknown }[] }
interface ShelterLike { captureR(code: string, o: object): Promise<Capture>; purge(): Promise<void> }
interface WebRLike {
  init(): Promise<void>
  close(): void
  installPackages(pkgs: string[], o?: object): Promise<void>
  FS: { writeFile(path: string, data: Uint8Array): Promise<void> }
  Shelter: new () => Promise<ShelterLike>
}

const BASE_PACKAGES = new Set(['stats', 'utils', 'graphics', 'grDevices', 'methods', 'base', 'datasets'])

/** Пакеты, которые подключает код: library(x), require(x), x::f. */
export function requiredPackages(source: string): string[] {
  const names = new Set<string>()
  for (const m of source.matchAll(/(?:library|require)\(\s*["']?([A-Za-z][\w.]*)["']?\s*\)/g)) names.add(m[1])
  for (const m of source.matchAll(/\b([A-Za-z][\w.]*)::/g)) names.add(m[1])
  return [...names].filter(n => !BASE_PACKAGES.has(n))
}

export class WebREngine implements CodeEngine {
  private webR: WebRLike | null = null
  private ready: Promise<void> | null = null
  private installed = new Set<string>()
  loaded = false

  load(): Promise<void> {
    this.ready ??= (async () => {
      const mod = await import(/* @vite-ignore */ `${WEBR_URL}webr.mjs`) as { WebR: new (o: object) => WebRLike }
      const webR = new mod.WebR({ baseUrl: WEBR_URL, interactive: false })
      await webR.init()
      this.webR = webR
      this.loaded = true
    })().catch(err => { this.ready = null; throw err })
    return this.ready
  }

  private reset() {
    try { this.webR?.close() } catch { /* уже закрыт */ }
    this.webR = null; this.ready = null; this.loaded = false; this.installed.clear()
  }

  async run(source: string, files: EngineFile[], timeoutMs: number): Promise<EngineResult> {
    await this.load()
    const webR = this.webR!
    const work = (async (): Promise<EngineResult> => {
      for (const f of files) await webR.FS.writeFile(HOME + f.name, new TextEncoder().encode(f.content))
      const missing = requiredPackages(source).filter(p => !this.installed.has(p))
      if (missing.length) { await webR.installPackages(missing, { quiet: true }); missing.forEach(p => this.installed.add(p)) }
      const shelter = await new webR.Shelter()
      try {
        const res = await shelter.captureR(`setwd("${HOME}")\n${source}`, { withAutoprint: true, captureStreams: true, captureConditions: false })
        const output = res.output.map(o => String(o.data)).join('\n')
        // ошибка R внутри функции (например, нет такого столбца) приходит в поток stderr, а не исключением
        const rError = res.output.find(o => o.type === 'stderr' && /^\s*Error\b/.test(String(o.data)))
        return rError ? { ok: false, output, error: String(rError.data) } : { ok: true, output }
      } catch (err) {
        return { ok: false, output: '', error: String((err as Error)?.message ?? err) }
      } finally {
        await shelter.purge()
      }
    })()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<EngineResult>(resolve => {
      timer = setTimeout(() => { this.reset(); resolve({ ok: false, output: '', timeout: true }) }, timeoutMs)
    })
    const result = await Promise.race([work, timeout])
    clearTimeout(timer)
    return result
  }
}
