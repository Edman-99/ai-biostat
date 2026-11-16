import type { HttpClient } from '@/core/http/HttpClient'
import type { CaseRegistry } from '@/cases/CaseRegistry'
import type { AllCaseEdits } from '@/domain/cases/CaseEdits'

/** Правки текстов кейсов (редактор преподавателя) загружаются при входе и накладываются на кейсы в реестре. */
export class CaseEditsService {
  constructor(private http: HttpClient, private registry: CaseRegistry) {}

  async load(): Promise<void> {
    try { this.registry.setEdits(await this.http.get<AllCaseEdits>('/api/cases/edits')) }
    catch { /* без правок — исходные тексты кейсов */ }
  }
}
