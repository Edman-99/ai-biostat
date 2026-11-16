import type { AnalyticsData } from '@/api/types'
import type { CaseRegistry } from '@/cases/CaseRegistry'
import type { AiCheckEvaluator } from '@/domain/aicheck/AiCheckTrainer'
import { BLOCKS, competenciesFromCases, stepSuccess, weakestSteps } from '@/domain/progress/Competencies'
import { newCaseProgress } from '@/domain/progress/types'
import type { CaseScorer, ScoreSheet } from '@/domain/scoring/CaseScorer'

export interface GroupReport {
  participants: number
  active7: number
  started: number
  completed: number
  /** средний балл завершённых кейсов; null — завершённых нет */
  avgScore: number | null
  /** шаги кейса по порядку */
  steps: { key: string; pct: number }[]
  /** типичные затруднения — самые слабые шаги */
  weakest: { key: string; pct: number }[]
  /** входная диагностика (среднее по тем, кто прошёл) и результат в кейсах, % */
  competencies: { block: string; entry: number | null; cases: number | null }[]
  diagnosticsDone: number
  trainerPct: number | null
  trainerUsers: number
}

const DAY = 24 * 3600
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/** Сводка по группе для преподавателя. Без рейтинга: только обобщённые показатели. */
export class GroupAnalytics {
  constructor(private registry: CaseRegistry, private scorer: CaseScorer, private trainer: AiCheckEvaluator) {}

  groups(data: AnalyticsData): string[] {
    return [...new Set(data.people.map(p => p.grp).filter((g): g is string => !!g))].sort()
  }

  report(data: AnalyticsData, group: string | null, nowSec = Date.now() / 1000): GroupReport {
    const people = data.people.filter(p => !group || p.grp === group)
    const codes = new Set(people.map(p => p.code))
    const roleOf = new Map(people.map(p => [p.code, p.role]))
    const attempts = data.attempts.filter(a => codes.has(a.code))
    const done = attempts.filter(a => (a.max_step ?? 0) >= 10)

    const sheets: ScoreSheet[] = []
    done.forEach(a => {
      const def = this.registry.get(a.case_id)
      if (!def || !a.progress) return
      const level = roleOf.get(a.code) === 'specialist' ? 'post' : 'pre'
      sheets.push(this.scorer.score(def, { ...newCaseProgress(), ...a.progress }, level))
    })
    const fromCases = competenciesFromCases(sheets)
    const steps = stepSuccess(sheets)

    const diags = people.map(p => data.diagnostics[p.code]).filter(Boolean)
    const competencies = BLOCKS.map(block => ({
      block,
      entry: avg(diags.map(d => d[block]).filter((v): v is number => typeof v === 'number')),
      cases: fromCases ? fromCases[block] : null,
    }))

    const trainerPcts = people
      .map(p => this.trainer.successPct(data.trainer[p.code]))
      .filter((v): v is number => v !== null)

    return {
      participants: people.length,
      active7: people.filter(p => p.last_active && nowSec - p.last_active < 7 * DAY).length,
      started: new Set(attempts.map(a => a.code)).size,
      completed: done.length,
      avgScore: avg(done.map(a => a.score).filter((s): s is number => typeof s === 'number')),
      steps,
      weakest: weakestSteps(steps),
      competencies,
      diagnosticsDone: diags.length,
      trainerPct: avg(trainerPcts),
      trainerUsers: trainerPcts.length,
    }
  }
}
