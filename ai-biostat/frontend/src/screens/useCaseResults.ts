import { useMemo } from 'react'
import { useAppState, useServices } from '@/app/ServicesContext'
import { catalogFor, type CatalogEntry } from '@/cases/CaseRegistry'
import type { Grade } from '@/domain/grading/GradeScale'
import type { CaseProgress } from '@/domain/progress/types'
import type { ScoreSheet } from '@/domain/scoring/CaseScorer'

export type CaseStatus = 'empty' | 'new' | 'progress' | 'done'

export interface CaseResult {
  entry: CatalogEntry
  status: CaseStatus
  progress: CaseProgress | null
  /** баллы — только после дебрифинга (во время кейса скрыты) */
  sheet: ScoreSheet | null
  grade: Grade | null
}

/** Кейсы, доступные роли, с состоянием прохождения. Балл появляется с шага 9 (дебрифинг). */
export function useCaseResults(): CaseResult[] {
  const { app, cases, scorer, grades } = useServices()
  const { me, cases: progressById } = useAppState()
  const level = app.level()
  return useMemo(() => catalogFor(me?.role).map(entry => {
    const def = cases.get(entry.id)
    const p = progressById[entry.id] ?? null
    if (!def) return { entry, status: 'empty' as const, progress: null, sheet: null, grade: null }
    if (!p || p.maxStep <= 1 && p.step <= 1) return { entry, status: 'new' as const, progress: p, sheet: null, grade: null }
    if (p.maxStep < 9) return { entry, status: 'progress' as const, progress: p, sheet: null, grade: null }
    const sheet = scorer.score(def, p, level)
    return { entry, status: 'done' as const, progress: p, sheet, grade: grades.gradeOf(sheet.total) }
  }), [me?.role, cases, progressById, scorer, grades, level])
}
