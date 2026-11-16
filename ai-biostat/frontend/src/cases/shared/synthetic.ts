/**
 * Общее для синтетических данных кейсов: воспроизводимый генератор случайных чисел и перемешанный набор
 * объектов по заданной таблице частот. Таблица задаёт итоговые доли точно — статистика в выводах шага 6
 * посчитана по ней заранее (scipy/statsmodels), поэтому числа на экране и в данных всегда совпадают.
 */
export function rng(seed: number): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}

/** [значение, сколько раз] → перемешанный список значений (Фишер–Йетс). */
export function shuffledUnits<T>(R: () => number, counts: [T, number][]): T[] {
  const out: T[] = []
  counts.forEach(([v, n]) => { for (let i = 0; i < n; i++) out.push(v) })
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const int = (R: () => number, min: number, max: number) => min + Math.floor(R() * (max - min + 1))
