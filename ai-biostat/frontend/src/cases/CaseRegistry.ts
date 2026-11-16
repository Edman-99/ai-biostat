import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import { applyEdits, type AllCaseEdits, type CaseTextEdits } from '@/domain/cases/CaseEdits'
import type { Localized } from '@/core/localized'
import { buildCase01 } from './case01/case01'
import { buildCase04 } from './case04/case04'
import { buildCase21 } from './case21/case21'
import { buildCase22 } from './case22/case22'
import { buildCase23 } from './case23/case23'
import type { Lang } from '@/api/types'

export type CaseLevel = 'basic' | 'advanced'

/** Строка каталога пилота: показывается на главной, даже если кейс ещё не наполнен. Казахский — черновик. */
export interface CatalogEntry {
  id: string
  title: Localized
  shortTitle: Localized
  methods: Localized
  level: CaseLevel
}

export const PILOT_CATALOG: CatalogEntry[] = [
  {
    id: '1', level: 'basic',
    title: { ru: 'Вспышка кори на учебной территории: оценка 7-1-7', kk: 'Оқу аумағындағы қызылша өршуі: 7-1-7 бағалауы', en: 'Measles outbreak in a training territory: 7-1-7 assessment' },
    shortTitle: { ru: 'Вспышка кори', kk: 'Қызылша өршуі', en: 'Measles outbreak' },
    methods: { ru: 'Доли, 95% ДИ, Мак-Немар', kk: 'Үлестер, 95% СА, Мак-Немар', en: 'Proportions, 95% CI, McNemar' },
  },
  {
    id: '21', level: 'basic',
    title: { ru: 'ВИЧ-инфекция и занятость: подавление вирусной нагрузки', kk: 'АИТВ-инфекциясы және жұмыспен қамту: вирустық жүктеменің басылуы', en: 'HIV infection and employment: viral load suppression' },
    shortTitle: { ru: 'ВИЧ-инфекция и занятость', kk: 'АИТВ-инфекциясы және жұмыспен қамту', en: 'HIV and employment' },
    methods: { ru: 'χ²-критерий', kk: 'χ²-критерий', en: 'χ² test' },
  },
  {
    id: '23', level: 'basic',
    title: { ru: 'Пропуск приёма АРТ и вирусная супрессия', kk: 'АРТ қабылдауды өткізіп алу және вирустық супрессия', en: 'Missed ART doses and viral suppression' },
    shortTitle: { ru: 'Пропуск приёма АРТ', kk: 'АРТ қабылдауды өткізіп алу', en: 'Missed ART doses' },
    methods: { ru: 'Сравнение двух долей', kk: 'Екі үлесті салыстыру', en: 'Comparing two proportions' },
  },
  {
    id: '4', level: 'basic',
    title: { ru: 'Неонатальный сепсис: случай-контроль', kk: 'Неонаталдық сепсис: жағдай-бақылау', en: 'Neonatal sepsis: case-control' },
    shortTitle: { ru: 'Неонатальный сепсис', kk: 'Неонаталдық сепсис', en: 'Neonatal sepsis' },
    methods: { ru: 'χ², отношение шансов', kk: 'χ², мүмкіндіктер қатынасы', en: 'χ², odds ratio' },
  },
  {
    id: '22', level: 'advanced',
    title: { ru: 'Стадия ВИЧ-инфекции и вирусная супрессия', kk: 'АИТВ-инфекциясының сатысы және вирустық супрессия', en: 'HIV stage and viral suppression' },
    shortTitle: { ru: 'Стадия ВИЧ и супрессия', kk: 'АИТВ сатысы және супрессия', en: 'HIV stage and suppression' },
    methods: { ru: 'Регрессия Пуассона', kk: 'Пуассон регрессиясы', en: 'Poisson regression' },
  },
]

export const catalogEntry = (id: string) => PILOT_CATALOG.find(e => e.id === id)

/** Решение методиста: студентам — 4 базовых кейса (1, 4, 21, 23), специалистам — все 5. */
export const catalogFor = (role: string | undefined): CatalogEntry[] =>
  role === 'specialist' ? PILOT_CATALOG : PILOT_CATALOG.filter(e => e.level === 'basic')

/** Кейс на нужном языке. Баллы от языка не зависят (шаблоны проверки общие), поэтому для подсчёта годится любой. */
export interface CaseSource {
  id: string
  build: (lang: Lang) => CaseDefinition
}

/** Наполненные кейсы. Новый кейс = новый файл описания + одна строка здесь. */
export class CaseRegistry {
  private sources = new Map<string, CaseSource>()
  private originals = new Map<string, CaseDefinition>()
  private cache = new Map<string, CaseDefinition>()
  private edits: AllCaseEdits = {}

  constructor(sources: CaseSource[]) { sources.forEach(s => this.sources.set(s.id, s)) }

  /** Кейс на языке lang с правками преподавателя (редактор кейсов). */
  get(id: string, lang: Lang = 'ru'): CaseDefinition | undefined {
    const key = `${id}|${lang}`
    if (!this.cache.has(key)) {
      const base = this.original(id, lang)
      if (!base) return undefined
      this.cache.set(key, applyEdits(base, this.edits[id]?.[lang]))
    }
    return this.cache.get(key)
  }

  /** Исходный кейс из кода, без правок (для редактора: «вернуть исходный текст»). */
  original(id: string, lang: Lang = 'ru'): CaseDefinition | undefined {
    const src = this.sources.get(id)
    if (!src) return undefined
    const key = `${id}|${lang}`
    if (!this.originals.has(key)) this.originals.set(key, src.build(lang))
    return this.originals.get(key)
  }

  setEdits(edits: AllCaseEdits) { this.edits = edits; this.cache.clear() }
  editsFor(id: string, lang: Lang): CaseTextEdits { return { ...(this.edits[id]?.[lang] ?? {}) } }
  has(id: string): boolean { return this.sources.has(id) }
  ids(): string[] { return [...this.sources.keys()] }
}

export const defaultCaseRegistry = () => new CaseRegistry([
  { id: '1', build: buildCase01 },
  { id: '4', build: buildCase04 },
  { id: '21', build: buildCase21 },
  { id: '22', build: buildCase22 },
  { id: '23', build: buildCase23 },
])
