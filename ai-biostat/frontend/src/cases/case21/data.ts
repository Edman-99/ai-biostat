import type { Lang } from '@/api/types'

/**
 * Синтетические данные кейса 21 (воспроизводят опубликованные доли).
 * Генератор, seed и порядок вызовов те же, что в прежней версии, — строки на экране совпадают один в один.
 * Язык меняет только подписи категорий; сами строки, числа и «грязь» для шага 2 одинаковы на всех языках.
 */
export type EmpKey = 'self' | 'home' | 'wage'

export interface Case21Labels {
  emp: Record<EmpKey, string>
  yes: string
  no: string
  male: string
  female: string
  /** ошибка кодирования пола в строке 13 */
  badSex: string
}

export const CASE21_LABELS: Record<Lang, Case21Labels> = {
  ru: {
    emp: { self: 'Самозанятые', home: 'Домохозяйки', wage: 'Работающие по найму' },
    yes: 'Да', no: 'Нет', male: 'М', female: 'Ж', badSex: 'M (лат.)',
  },
  kk: {
    emp: { self: 'Өзін-өзі жұмыспен қамтығандар', home: 'Үй шаруасындағы әйелдер', wage: 'Жалдамалы жұмыскерлер' },
    yes: 'Иә', no: 'Жоқ', male: 'Е', female: 'Ә', badSex: 'E (лат.)',
  },
  en: {
    emp: { self: 'Self-employed', home: 'Homemakers', wage: 'Wage employees' },
    yes: 'Yes', no: 'No', male: 'M', female: 'F', badSex: 'male',
  },
}

export interface Case21Row {
  id: number
  age: number
  sex: string
  emp: string
  vl: number
  sup: string
}

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}

export function generateCase21Rows(lang: Lang = 'ru'): Case21Row[] {
  const L = CASE21_LABELS[lang]
  const R = rng(21)
  const groups: [EmpKey, number, number][] = [['self', 156, 30], ['home', 70, 21], ['wage', 94, 6]]
  const base: { emp: EmpKey; sup: boolean }[] = []
  groups.forEach(([emp, s, ns]) => {
    for (let i = 0; i < s; i++) base.push({ emp, sup: true })
    for (let i = 0; i < ns; i++) base.push({ emp, sup: false })
  })
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]]
  }
  const rows: Case21Row[] = base.map((r, i) => {
    const age = Math.round(22 + R() * 38)
    const sex = r.emp === 'home' ? L.female : (R() < 0.62 ? L.male : L.female)
    const vl = r.sup ? Math.round(R() * 39) : Math.round(Math.exp(4 + R() * 7))
    return { id: i + 1, age, sex, emp: L.emp[r.emp], vl, sup: r.sup ? L.yes : L.no }
  })
  // «грязь» для шага 2
  rows[3].age = 230
  rows[8].vl = -35
  rows[12].sex = L.badSex
  return rows
}
