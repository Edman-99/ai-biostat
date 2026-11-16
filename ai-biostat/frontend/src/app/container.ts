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
import { DIAGNOSTIC_A, DIAGNOSTIC_B } from '@/domain/diagnostic/questions'
import { SimulatedCodeRunner } from '@/domain/code/SimulatedCodeRunner'
import { BrowserCodeRunner } from '@/domain/code/BrowserCodeRunner'
import { PyodideEngine } from '@/core/runtime/PyodideEngine'
import { WebREngine } from '@/core/runtime/WebREngine'
import type { CodeRunner } from '@/domain/code/CodeRunner'
import { AiCheckEvaluator } from '@/domain/aicheck/AiCheckTrainer'
import { GroupAnalytics } from '@/domain/analytics/GroupAnalytics'
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
  /** итоговая диагностика (вариант Б) */
  exitDiagnostic: DiagnosticEvaluator
  codeRunner: CodeRunner
  aiCheck: AiCheckEvaluator
  analytics: GroupAnalytics
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
  const aiCheck = new AiCheckEvaluator()
  const diagnostic = new DiagnosticEvaluator(DIAGNOSTIC_A, 'A')
  return {
    aiCheck,
    analytics: new GroupAnalytics(cases, scorer, aiCheck),
    app,
    language,
    theme: new ThemeService(),
    cases,
    scorer,
    grades,
    session: new SessionService(app, new AuthApi(http), progressApi, language, diagnostic),
    saver: new AutoSaver(app, progressApi, new ProgressSerializer(cases, scorer, grades)),
    research: new ResearchTracker(app, new ResearchApi(http)),
    disputes: new DisputesApi(http),
    teacher: new TeacherApi(http),
    debrief: new DebriefBuilder(),
    diagnostic,
    exitDiagnostic: new DiagnosticEvaluator(DIAGNOSTIC_B, 'B'),
    // настоящий R/Python в браузере; если не загрузится — имитация с пометкой
    codeRunner: new BrowserCodeRunner({ Python: new PyodideEngine(), R: new WebREngine() }, new SimulatedCodeRunner()),
  }
}
