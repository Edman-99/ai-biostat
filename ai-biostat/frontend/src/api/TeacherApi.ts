import type { HttpClient } from '@/core/http/HttpClient'
import type { ExportKind, ImportResult, IssuedPassword, Lang, Overview } from './types'

export class TeacherApi {
  constructor(private http: HttpClient) {}

  overview() { return this.http.get<Overview>('/api/teacher/overview') }

  resolveDispute(id: number, decision: 'keep' | 'change', new_score: number | null, reason: string) {
    return this.http.post<{ ok: boolean }>(`/api/teacher/disputes/${id}`, { decision, new_score, reason })
  }

  confirm(code: string, caseId: string) {
    return this.http.post<{ ok: boolean }>(
      `/api/teacher/confirm/${encodeURIComponent(code)}/${encodeURIComponent(caseId)}`)
  }

  importParticipants(csv: string) {
    return this.http.post<ImportResult>('/api/teacher/participants/import', { csv })
  }

  createGroup(group: string, count: number, role: 'student' | 'specialist', lang: Lang) {
    return this.http.post<ImportResult>('/api/teacher/participants/group', { group, count, role, lang })
  }

  resetPassword(code: string) {
    return this.http.post<IssuedPassword>(`/api/teacher/participants/${encodeURIComponent(code)}/reset`)
  }

  exportUrl(kind: ExportKind) { return `/api/teacher/export/${kind}.csv` }
}
