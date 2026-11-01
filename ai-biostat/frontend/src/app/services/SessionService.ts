import type { AuthApi } from '@/api/AuthApi'
import type { ProgressApi } from '@/api/ProgressApi'
import type { AppStore } from '../AppStore'
import type { LanguageService } from './LanguageService'

/** Вход, выход, восстановление сессии и профиль. */
export class SessionService {
  constructor(
    private app: AppStore,
    private auth: AuthApi,
    private progress: ProgressApi,
    private lang: LanguageService,
  ) {}

  /** При открытии сайта: если cookie сессии жива — сразу в работу. */
  async restore(): Promise<void> {
    try {
      const me = await this.auth.me()
      this.lang.applyDefault(me.lang)
      this.app.signIn(me, await this.progress.load())
    } catch {
      this.app.navigate('login')
    }
  }

  async login(code: string, password: string): Promise<void> {
    const me = await this.auth.login(code, password)
    this.lang.applyDefault(me.lang)
    this.app.signIn(me, await this.progress.load())
  }

  async logout(): Promise<void> {
    try { await this.auth.logout() } catch { /* всё равно выходим */ }
    location.reload()
  }

  async updateProfile(firstName: string, lastName: string): Promise<void> {
    this.app.setMe(await this.auth.updateProfile(firstName, lastName))
  }
}
