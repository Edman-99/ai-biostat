import { FetchHttpClient } from '@/core/http/HttpClient'
import { AuthApi } from '@/api/AuthApi'
import { ProgressApi } from '@/api/ProgressApi'
import { ResearchApi } from '@/api/ResearchApi'
import { DisputesApi } from '@/api/DisputesApi'
import { TeacherApi } from '@/api/TeacherApi'
import { defaultCaseRegistry, type CaseRegistry } from '@/cases/CaseRegistry'
import { GradeScale } from '@/domain/grading/GradeScale'
import { CaseScorer } from '@/domain/scoring/CaseScorer'
import { DebriefBuilder } from '@/domain/scoring/DebriefBuilder'
import { DiagnosticEvaluator } from '@/domain/diagnostic/Diagnostic'
import { SimulatedCodeRunner } from '@/domain/code/SimulatedCodeRunner'
import type { CodeRunner } from '@/domain/code/CodeRunner'
import i18n from '@/i18n'
import { AppStore } from './AppStore'
import { AutoSaver } from './services/AutoSaver'
import { ProgressSerializer } from './services/ProgressSerializer'
import { ResearchTracker } from './services/ResearchTracker'
import { LanguageService } from './services/LanguageService'
import { SessionService } from './services/SessionService'
import { ThemeService } from './services/ThemeService'

export interface Services {
  app: AppStore
  session: SessionService
  language: LanguageService
  theme: ThemeService
  saver: AutoSaver
  research: ResearchTracker
  disputes: DisputesApi
  teacher: TeacherApi
  cases: CaseRegistry
  scorer: CaseScorer
  grades: GradeScale
  debrief: DebriefBuilder
  diagnostic: DiagnosticEvaluator
  codeRunner: CodeRunner
}

/** Точка сборки: здесь и только здесь выбираются конкретные реализации. */
export function createServices(): Services {
  const http = new FetchHttpClient()
  const app = new AppStore()
  const cases = defaultCaseRegistry()
  const scorer = new CaseScorer()
  const grades = new GradeScale()
  const progressApi = new ProgressApi(http)
  const language = new LanguageService(i18n)
  return {
    app,
    language,
    theme: new ThemeService(),
    cases,
    scorer,
    grades,
    session: new SessionService(app, new AuthApi(http), progressApi, language),
    saver: new AutoSaver(app, progressApi, new ProgressSerializer(cases, scorer, grades)),
    research: new ResearchTracker(app, new ResearchApi(http)),
    disputes: new DisputesApi(http),
    teacher: new TeacherApi(http),
    debrief: new DebriefBuilder(),
    diagnostic: new DiagnosticEvaluator(),
    codeRunner: new SimulatedCodeRunner(),
  }
}
