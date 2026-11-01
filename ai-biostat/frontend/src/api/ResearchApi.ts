import type { HttpClient } from '@/core/http/HttpClient'

export interface ResearchEvent {
  case_id: string | null
  step: number | null
  type: string
  payload?: Record<string, unknown>
}

/** Данные для исследования: события и результаты диагностики. */
export class ResearchApi {
  constructor(private http: HttpClient) {}

  event(e: ResearchEvent) { return this.http.post<{ ok: boolean }>('/api/events', e) }

  diagnostic(variant: string, answers: (number | null)[], pct: Record<string, number>) {
    return this.http.post<{ ok: boolean }>('/api/diagnostic', { variant, answers, pct })
  }
}
