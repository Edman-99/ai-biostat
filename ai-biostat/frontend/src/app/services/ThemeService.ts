import { Store } from '@/core/store/Store'

export type Theme = 'light' | 'dark'
const KEY = 'aib-theme'

/**
 * Тема оформления. Пока пользователь не выбрал сам — следуем настройке устройства.
 * Выбор хранится в браузере и ставится атрибутом data-theme на <html> (стили — в global.css).
 */
export class ThemeService extends Store<Theme> {
  private media = window.matchMedia('(prefers-color-scheme: dark)')

  constructor() {
    super('light')
    this.setState(this.effective())
    this.media.addEventListener('change', () => { if (!this.stored()) this.setState(this.effective()) })
  }

  toggle() {
    const next: Theme = this.getState() === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* приватный режим */ }
    document.documentElement.dataset.theme = next
    this.setState(next)
  }

  private effective(): Theme {
    return this.stored() ?? (this.media.matches ? 'dark' : 'light')
  }

  private stored(): Theme | null {
    try {
      const v = localStorage.getItem(KEY)
      return v === 'dark' || v === 'light' ? v : null
    } catch { return null }
  }
}
