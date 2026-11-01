/**
 * Синтетические данные кейса 21 (воспроизводят опубликованные доли).
 * Генератор, seed и порядок вызовов те же, что в прежней версии, — строки на экране совпадают один в один.
 */
export interface Case21Row {
  id: number
  age: number
  sex: string
  emp: string
  vl: number
  sup: 'Да' | 'Нет'
}

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}

export function generateCase21Rows(): Case21Row[] {
  const R = rng(21)
  const groups: [string, number, number][] = [['Самозанятые', 156, 30], ['Домохозяйки', 70, 21], ['Работающие по найму', 94, 6]]
  const base: Pick<Case21Row, 'emp' | 'sup'>[] = []
  groups.forEach(([emp, s, ns]) => {
    for (let i = 0; i < s; i++) base.push({ emp, sup: 'Да' })
    for (let i = 0; i < ns; i++) base.push({ emp, sup: 'Нет' })
  })
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]]
  }
  const rows = base.map((r, i) => {
    const age = Math.round(22 + R() * 38)
    const sex = r.emp === 'Домохозяйки' ? 'Ж' : (R() < 0.62 ? 'М' : 'Ж')
    const vl = r.sup === 'Да' ? Math.round(R() * 39) : Math.round(Math.exp(4 + R() * 7))
    return { ...r, id: i + 1, age, sex, vl }
  })
  // «грязь» для шага 2
  rows[3].age = 230
  rows[8].vl = -35
  rows[12].sex = 'M (лат.)'
  return rows
}
