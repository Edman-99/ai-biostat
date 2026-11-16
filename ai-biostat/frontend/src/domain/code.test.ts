import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defaultCaseRegistry } from '@/cases/CaseRegistry'
import { requiredPackages } from '@/core/runtime/WebREngine'
import { BrowserCodeRunner, shortError, type CodeEngine, type EngineResult } from './code/BrowserCodeRunner'
import { assembleSource } from './code/CodeChecker'
import { SimulatedCodeRunner } from './code/SimulatedCodeRunner'
import type { RunRequest } from './code/CodeRunner'

const registry = defaultCaseRegistry()
const IDS = ['1', '4', '21', '22', '23']

class FakeEngine implements CodeEngine {
  loaded = false
  calls: { source: string; files: { name: string; content: string }[] }[] = []
  constructor(private result: EngineResult, private failLoad = false) {}
  async load() { if (this.failLoad) throw new Error('нет сети'); this.loaded = true }
  async run(source: string, files: { name: string; content: string }[]) { this.calls.push({ source, files }); return this.result }
}

const req = (id: string, blanks?: string[]): RunRequest => {
  const def = registry.get(id, 'ru')!
  return { def, lang: 'Python', mode: 'template', blanks: blanks ?? [...def.code.blankAnswers], code: '' }
}

describe('шаг 6: сборка кода и данные', () => {
  it.each(IDS)('кейс %s: пропуски подставлены, CSV без «грязи», та же длина', id => {
    const r = req(id)
    const src = assembleSource(r)
    expect(src).not.toMatch(/\[\d\]/)
    r.def.code.blankAnswers.forEach(a => expect(src).toContain(a))
    const csv = r.def.data.csv!()
    const lines = csv.split('\n')
    expect(lines[0]).toBe(r.def.data.columns.join(','))
    expect(lines.length - 1).toBe(r.def.data.totalRows)
    // строки с ошибками шага 2 в исправленной таблице другие, остальные строки превью совпадают
    const asLine = (row: Record<string, string | number>) => r.def.data.columns.map(c => row[c]).join(',')
    r.def.data.preview.forEach((row, i) => {
      const bad = Object.keys(r.def.data.errors).map(Number).includes(i + 1)
      if (bad) expect(lines[i + 1]).not.toBe(asLine(row))
      else expect(lines[i + 1]).toBe(asLine(row))
    })
  })

  it.each(IDS)('кейс %s: каждый пропуск [n] встречается в шаблоне ровно один раз (иначе лишние поля ввода)', id => {
    const def = registry.get(id, 'ru')!
    for (const lang of ['R', 'Python'] as const) {
      const text = def.code.templates[lang].join('\n')
      def.code.blankAnswers.forEach((_, i) => expect(text.split(`[${i}]`).length - 1, `${lang} [${i}]`).toBe(1))
      expect(text.match(/\[(\d)\]/g)!.length).toBe(def.code.blankAnswers.length)
    }
  })

  it('пакеты R из кода и короткое сообщение об ошибке', () => {
    expect(requiredPackages('library(sandwich); library(lmtest)\nstats::glm(y ~ x)\nrequire("zoo")').sort()).toEqual(['lmtest', 'sandwich', 'zoo'])
    expect(shortError('Traceback (most recent call last):\n  File "<exec>", line 4\nKeyError: \'employmnt\'')).toBe("KeyError: 'employmnt'")
  })
})

describe('шаг 6: настоящий запуск (движок подменён)', () => {
  const fallback = new SimulatedCodeRunner(0)

  it('успех: код выполнился и анализ верный → вывод движка, файл данных передан', async () => {
    const py = new FakeEngine({ ok: true, output: '11.12 0.0038 2\n' })
    const runner = new BrowserCodeRunner({ Python: py, R: new FakeEngine({ ok: true, output: '' }) }, fallback)
    const res = await runner.run(req('21'), () => {})
    expect(res).toEqual({ ok: true, output: '11.12 0.0038 2' })
    expect(py.calls[0].files[0].name).toBe('case21_hiv_employment.csv')
  })

  it('код выполнился, но не те переменные → «не тот анализ»', async () => {
    const runner = new BrowserCodeRunner({ Python: new FakeEngine({ ok: true, output: 'что-то' }), R: new FakeEngine({ ok: true, output: '' }) }, fallback)
    const res = await runner.run(req('21', ['age', 'sex']), () => {})
    expect(res).toMatchObject({ ok: false, kind: 'wrong', output: 'что-то' })
  })

  it('ошибка выполнения и превышение времени', async () => {
    const err = new BrowserCodeRunner({ Python: new FakeEngine({ ok: false, output: '', error: 'Traceback\nKeyError: x' }), R: new FakeEngine({ ok: true, output: '' }) }, fallback)
    expect(await err.run(req('4'), () => {})).toMatchObject({ ok: false, kind: 'runtime', error: 'KeyError: x' })
    const slow = new BrowserCodeRunner({ Python: new FakeEngine({ ok: false, output: '', timeout: true }), R: new FakeEngine({ ok: true, output: '' }) }, fallback)
    expect(await slow.run(req('4'), () => {})).toMatchObject({ ok: false, kind: 'timeout' })
  })

  it('язык не загрузился → имитация с пометкой', async () => {
    const runner = new BrowserCodeRunner({ Python: new FakeEngine({ ok: true, output: '' }, true), R: new FakeEngine({ ok: true, output: '' }) }, fallback)
    const infos: unknown[] = []
    const res = await runner.run(req('23'), () => {}, i => infos.push(i))
    expect(res).toMatchObject({ ok: true, simulated: true })
    expect(infos).toEqual(['loading', null])
  })
})

/** AIB_EXPORT=<папка> npx vitest run code — выгрузить CSV и код всех кейсов, чтобы прогнать настоящим Python/R. */
describe.runIf(!!process.env.AIB_EXPORT)('выгрузка для проверки настоящим Python', () => {
  it('пишет файлы', () => {
    const dir = process.env.AIB_EXPORT!
    mkdirSync(dir, { recursive: true })
    for (const id of IDS) for (const lang of ['ru', 'kk', 'en'] as const) {
      const def = registry.get(id, lang)!
      const sub = join(dir, `${id}_${lang}`)
      mkdirSync(sub, { recursive: true })
      writeFileSync(join(sub, def.data.fileName), def.data.csv!())
      for (const L of ['Python', 'R'] as const) {
        writeFileSync(join(sub, L === 'R' ? 'main.R' : 'main.py'), assembleSource({ def, lang: L, mode: 'template', blanks: [...def.code.blankAnswers], code: '' }))
      }
    }
  })
})
