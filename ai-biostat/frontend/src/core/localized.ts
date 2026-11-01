import type { Lang } from '@/api/types'

/** Текст на трёх языках — для коротких данных (каталог, демо-диагностика). */
export type Localized = Record<Lang, string>

export const pick = (text: Localized, lang: string): string => text[lang as Lang] ?? text.ru
