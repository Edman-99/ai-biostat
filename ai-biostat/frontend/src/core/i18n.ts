import { useTranslation } from 'react-i18next'
import type { Lang } from '@/api/types'

const LANGS: Lang[] = ['ru', 'kk', 'en']

export function useLang(): Lang {
  const { i18n } = useTranslation()
  return LANGS.includes(i18n.language as Lang) ? (i18n.language as Lang) : 'ru'
}
