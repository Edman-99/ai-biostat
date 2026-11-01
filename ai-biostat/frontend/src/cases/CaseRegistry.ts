import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import { case21 } from './case21/case21'

export type CaseLevel = 'Базовый' | 'Сложный'

/** Строка каталога пилота: показывается на главной, даже если кейс ещё не наполнен. */
export interface CatalogEntry {
  id: string
  title: string
  methods: string
  level: CaseLevel
}

export const PILOT_CATALOG: CatalogEntry[] = [
  { id: '1', title: 'Вспышка кори на учебной территории: оценка 7-1-7', methods: 'Доли, 95% ДИ, Мак-Немар', level: 'Базовый' },
  { id: '21', title: 'ВИЧ-инфекция и занятость: подавление вирусной нагрузки', methods: 'χ²-критерий', level: 'Базовый' },
  { id: '23', title: 'Пропуск приёма АРТ и вирусная супрессия', methods: 'Сравнение двух долей', level: 'Базовый' },
  { id: '4', title: 'Неонатальный сепсис: случай-контроль', methods: 'χ², отношение шансов', level: 'Базовый' },
  { id: '22', title: 'Стадия ВИЧ-инфекции и вирусная супрессия', methods: 'Регрессия Пуассона', level: 'Сложный' },
]

/** Наполненные кейсы. Новый кейс = новый файл описания + одна строка здесь. */
export class CaseRegistry {
  private cases = new Map<string, CaseDefinition>()

  constructor(defs: CaseDefinition[]) { defs.forEach(d => this.cases.set(d.id, d)) }

  get(id: string): CaseDefinition | undefined { return this.cases.get(id) }
  has(id: string): boolean { return this.cases.has(id) }
  ids(): string[] { return [...this.cases.keys()] }
}

export const defaultCaseRegistry = () => new CaseRegistry([case21])
