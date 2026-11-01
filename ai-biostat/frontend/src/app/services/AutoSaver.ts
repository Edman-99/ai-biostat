import { Store } from '@/core/store/Store'
import { ApiError } from '@/core/http/HttpClient'
import type { ProgressApi } from '@/api/ProgressApi'
import type { AppStore } from '../AppStore'
import type { ProgressSerializer } from './ProgressSerializer'

export type SaveStatus = 'idle' | 'saved' | 'expired' | 'offline'

/** Автосохранение прогресса: через 600 мс после последнего изменения, без повторной отправки того же. */
export class AutoSaver extends Store<SaveStatus> {
  private timer: ReturnType<typeof setTimeout> | undefined
  private lastSaved = ''

  constructor(
    private app: AppStore,
    private api: ProgressApi,
    private serializer: ProgressSerializer,
    private delayMs = 600,
  ) { super('idle') }

  start(): () => void {
    return this.app.subscribe(() => this.schedule())
  }

  private canSave(): boolean {
    const s = this.app.getState()
    return !!s.me && s.me.role !== 'teacher' && s.screen !== 'login'
  }

  private schedule() {
    if (!this.canSave()) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.delayMs)
  }

  private async flush() {
    if (!this.canSave()) return
    const saved = this.serializer.toSaved(this.app.getState(), this.app.level())
    const json = JSON.stringify(saved)
    if (json === this.lastSaved) return
    try {
      await this.api.save(saved)
      this.lastSaved = json
      this.setState('saved')
    } catch (e) {
      this.setState(e instanceof ApiError && e.status === 401 ? 'expired' : 'offline')
    }
  }
}
