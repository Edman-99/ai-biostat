import type { HttpClient } from '@/core/http/HttpClient'

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface TutorStatus { enabled: boolean; left: number; limit: number }

/** Встроенный ИИ-репетитор: запрос идёт через наш сервер (ключ API только там). */
export class TutorApi {
  constructor(private http: HttpClient) {}

  status() { return this.http.get<TutorStatus>('/api/tutor/status') }

  ask(body: { case_id: string | null; step: number | null; lang: string; context: string; messages: ChatMessage[] }) {
    return this.http.post<{ reply: string; left: number }>('/api/tutor', body)
  }
}
