import type { HttpClient } from '@/core/http/HttpClient'

export interface SurveyGroupStatus { grp: string; people: number; done: number; sus_avg: number | null; open: boolean }

/** Опросник обратной связи: ответы участника и управление группами (преподаватель). */
export class SurveyApi {
  constructor(private http: HttpClient) {}

  mine() { return this.http.get<{ done: boolean; sus: number | null; ts: number | null }>('/api/survey/mine') }

  submit(answers: Record<string, number | string>) { return this.http.post<{ ok: boolean; sus: number | null }>('/api/survey', { answers }) }

  status() { return this.http.get<{ groups: SurveyGroupStatus[]; mine_done: boolean }>('/api/teacher/survey') }

  setOpen(group: string, open: boolean) { return this.http.post<{ ok: boolean }>('/api/teacher/survey/open', { group, open }) }

  exportUrl() { return '/api/teacher/export/survey.csv' }
}
