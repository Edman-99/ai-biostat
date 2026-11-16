import type { AuthApi } from '@/api/AuthApi'
import type { ProgressApi } from '@/api/ProgressApi'
import type { AppStore } from '../AppStore'
import type { LanguageService } from './LanguageService'
import type { DiagnosticEvaluator } from '@/domain/diagnostic/Diagnostic'
import type { SavedState } from '@/domain/progress/types'
import type { CaseEditsService } from './CaseEditsService'

/** Вход, выход, восстановление сессии и профиль. */
export class SessionService {
  constructor(
    private app: AppStore,
    private auth: AuthApi,
    private progress: ProgressApi,
    private lang: LanguageService,
    private diagnostic: DiagnosticEvaluator,
    private caseEdits: CaseEditsService,
  ) {}

  /** Ответы старого демо (4 вопроса) не подходят к нынешней диагностике — её нужно пройти заново. */
  private normalize(saved: SavedState | null): SavedState | null {
    if (!saved || !saved.diagDone || this.diagnostic.matches(saved.diagAns)) return saved
    return { ...saved, diagAns: [], diagDone: false, pct: null }
  }

  /** При открытии сайта: если cookie сессии жива — сразу в работу. */
  async restore(): Promise<void> {
    try {
      const me = await this.auth.me()
      this.lang.applyDefault(me.lang)
      await this.caseEdits.load()
    this.app.signIn(me, this.normalize(await this.progress.load()))
    } catch {
      this.app.navigate('login')
    }
  }

  async login(code: string, password: string): Promise<void> {
    const me = await this.auth.login(code, password)
    this.lang.applyDefault(me.lang)
    await this.caseEdits.load()
    this.app.signIn(me, this.normalize(await this.progress.load()))
  }

  /** Обновить данные о себе (например, преподаватель открыл итоговую диагностику). Ошибки сети не мешают. */
  async refreshMe(): Promise<void> {
    try { this.app.setMe(await this.auth.me()) } catch { /* остаёмся с прежними данными */ }
  }

  async logout(): Promise<void> {
    try { await this.auth.logout() } catch { /* всё равно выходим */ }
    location.reload()
  }

  async updateProfile(firstName: string, lastName: string): Promise<void> {
    this.app.setMe(await this.auth.updateProfile(firstName, lastName))
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.auth.changePassword(oldPassword, newPassword)
  }
}
