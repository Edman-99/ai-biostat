/// <reference lib="webworker" />
/**
 * Python (Pyodide) в отдельном потоке: страница не зависает, а зациклившийся код можно остановить.
 * Pyodide и пакеты (pandas, scipy, statsmodels) грузятся с CDN при первом запуске и кешируются браузером.
 */
const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

interface PyodideLike {
  FS: { writeFile(path: string, data: string): void }
  setStdout(o: { batched: (s: string) => void }): void
  setStderr(o: { batched: (s: string) => void }): void
  loadPackagesFromImports(code: string): Promise<unknown>
  runPythonAsync(code: string): Promise<unknown>
}

let py: PyodideLike | null = null

async function ensure(): Promise<PyodideLike> {
  if (py) return py
  const mod = await import(/* @vite-ignore */ `${PYODIDE_INDEX}pyodide.mjs`) as { loadPyodide: (o: { indexURL: string }) => Promise<PyodideLike> }
  py = await mod.loadPyodide({ indexURL: PYODIDE_INDEX })
  // самое частое для кейсов — сразу, чтобы первый запуск не ждал дважды
  await py.loadPackagesFromImports('import pandas, scipy, statsmodels')
  // служебные предупреждения библиотек (Pyarrow, устаревшие функции) студенту не нужны; остальные остаются
  await py.runPythonAsync('import warnings\nwarnings.filterwarnings("ignore", category=DeprecationWarning)\nwarnings.filterwarnings("ignore", category=FutureWarning)')
  return py
}

self.onmessage = async (e: MessageEvent<{ id: number; type: 'load' | 'run'; source?: string; files?: { name: string; content: string }[] }>) => {
  const { id, type, source = '', files = [] } = e.data
  let output = ''
  try {
    const p = await ensure()
    if (type === 'load') { self.postMessage({ id, ok: true, output: '' }); return }
    files.forEach(f => p.FS.writeFile(f.name, f.content))
    p.setStdout({ batched: s => { output += `${s}\n` } })
    p.setStderr({ batched: s => { output += `${s}\n` } })
    await p.loadPackagesFromImports(source)
    await p.runPythonAsync(source)
    self.postMessage({ id, ok: true, output })
  } catch (err) {
    self.postMessage({ id, ok: false, output, error: String((err as Error)?.message ?? err) })
  }
}
