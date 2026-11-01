import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { Localized } from '@/core/localized'
import { case21 } from './case21/case21'

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

/** Наполненные кейсы. Новый кейс = новый файл описания + одна строка здесь. */
export class CaseRegistry {
  private cases = new Map<string, CaseDefinition>()

  constructor(defs: CaseDefinition[]) { defs.forEach(d => this.cases.set(d.id, d)) }

  get(id: string): CaseDefinition | undefined { return this.cases.get(id) }
  has(id: string): boolean { return this.cases.has(id) }
  ids(): string[] { return [...this.cases.keys()] }
}

export const defaultCaseRegistry = () => new CaseRegistry([case21])
