import type { i18n as I18n } from 'i18next'
import type { Lang } from '@/api/types'

const KEY = 'aib-lang'

/** Язык интерфейса: выбор пользователя запоминается в браузере, иначе — язык из карточки участника. */
export class LanguageService {
  constructor(private i18n: I18n) {}

  current(): Lang { return (this.i18n.language as Lang) || 'ru' }

  choose(lang: Lang) {
    try { localStorage.setItem(KEY, lang) } catch { /* приватный режим */ }
    void this.i18n.changeLanguage(lang)
  }

  applyDefault(lang: Lang | null) {
    if (lang && !this.stored()) void this.i18n.changeLanguage(lang)
  }

  stored(): Lang | null {
    try { return localStorage.getItem(KEY) as Lang | null } catch { return null }
  }
}
