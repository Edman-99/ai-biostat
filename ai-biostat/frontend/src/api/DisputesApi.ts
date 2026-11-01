import type { HttpClient } from '@/core/http/HttpClient'

export class DisputesApi {
  constructor(private http: HttpClient) {}

  open(case_id: string, step: string, text: string, ai_score: number | null) {
    return this.http.post<{ ok: boolean }>('/api/disputes', { case_id, step, text, ai_score })
  }
}
