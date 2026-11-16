import type { Dataset } from './Dataset'

export interface NumericSummary {
  kind: 'numeric'
  n: number
  missing: number
  mean: number
  sd: number
  median: number
  q1: number
  q3: number
  min: number
  max: number
}

export interface Frequency { value: string; n: number; pct: number }

export interface CategoricalSummary {
  kind: 'categorical'
  n: number
  missing: number
  levels: Frequency[]
}

export type Summary = NumericSummary | CategoricalSummary

const isMissing = (v: string) => v === '' || /^(na|nan|null)$/i.test(v)

/** «31,2» и «31.2» — одно и то же число. */
export function toNumber(v: string): number {
  if (isMissing(v)) return NaN
  return Number(v.replace(/\s/g, '').replace(',', '.'))
}

/**
 * Квантиль как в R по умолчанию (type 7) и в pandas — чтобы цифры совпадали с кодом, который видит студент.
 */
export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN
  const h = (sorted.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

/** Количественная — если все значения числа и различных значений больше 5 (0/1 и шкалы 1–5 считаем категориями). */
export function isNumericColumn(values: string[]): boolean {
  const present = values.filter(v => !isMissing(v))
  if (!present.length || !present.every(v => Number.isFinite(toNumber(v)))) return false
  return new Set(present.map(toNumber)).size > 5
}

export function describeNumeric(values: string[]): NumericSummary {
  const nums = values.map(toNumber).filter(Number.isFinite)
  const sorted = [...nums].sort((a, b) => a - b)
  const n = nums.length
  const mean = n ? nums.reduce((a, b) => a + b, 0) / n : NaN
  const sd = n > 1 ? Math.sqrt(nums.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : NaN
  return {
    kind: 'numeric', n, missing: values.length - n, mean, sd,
    median: quantile(sorted, 0.5), q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75),
    min: sorted[0] ?? NaN, max: sorted[n - 1] ?? NaN,
  }
}

export function describeCategorical(values: string[]): CategoricalSummary {
  const present = values.filter(v => !isMissing(v))
  const counts = new Map<string, number>()
  present.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1))
  const levels = [...counts.entries()]
    .map(([value, n]) => ({ value, n, pct: present.length ? (n / present.length) * 100 : 0 }))
    .sort((a, b) => b.n - a.n || a.value.localeCompare(b.value))
  return { kind: 'categorical', n: present.length, missing: values.length - present.length, levels }
}

export function describe(ds: Dataset, column: string, forceCategorical = false): Summary {
  const values = ds.rows.map(r => r[column] ?? '')
  return !forceCategorical && isNumericColumn(values) ? describeNumeric(values) : describeCategorical(values)
}
