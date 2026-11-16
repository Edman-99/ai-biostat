import type { HttpClient } from '@/core/http/HttpClient'

/** Решение преподавателя по оспариванию (GET /api/disputes/mine). */
export interface MyDispute {
  id: number
  case_id: string
  step: string
  status: 'open' | 'resolved'
  decision: 'keep' | 'change' | null
  new_score: number | null
  reason: string | null
}

export class DisputesApi {
  constructor(private http: HttpClient) {}

  open(case_id: string, step: string, text: string, ai_score: number | null) {
    return this.http.post<{ ok: boolean }>('/api/disputes', { case_id, step, text, ai_score })
  }

  mine() { return this.http.get<MyDispute[]>('/api/disputes/mine') }
}
