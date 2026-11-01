import type { HttpClient } from '@/core/http/HttpClient'
import type { SavedState } from '@/domain/progress/types'

export class ProgressApi {
  constructor(private http: HttpClient) {}

  async load(): Promise<SavedState | null> {
    return (await this.http.get<{ state: SavedState | null }>('/api/state')).state
  }

  save(state: SavedState) { return this.http.put<{ ok: boolean }>('/api/state', { state }) }
}
