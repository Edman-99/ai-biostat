import { describe, expect, it } from 'vitest'
import ru from './locales/ru.json'
import kk from './locales/kk.json'
import en from './locales/en.json'

/** Все ключи с путём; у массивов — ещё и длина, чтобы списки шагов не разъехались. */
function keys(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`]
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
  return [prefix]
}

describe('переводы интерфейса', () => {
  const base = keys(ru).sort()
  it.each([['kk', kk], ['en', en]])('%s: те же ключи, что в ru', (_, loc) => {
    expect(keys(loc).sort()).toEqual(base)
  })
})
