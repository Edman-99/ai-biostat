import { createContext, useContext } from 'react'
import type { CaseDefinition } from '@/domain/cases/CaseDefinition'
import type { CaseProgress, Level } from '@/domain/progress/types'

/** Всё, что нужно шагу кейса: описание, ответы, уровень и действия. Шаги не знают про хранилище. */
export interface CaseSession {
  def: CaseDefinition
  progress: CaseProgress
  level: Level
  patch(p: Partial<CaseProgress> | ((c: CaseProgress) => Partial<CaseProgress>)): void
  go(step: number): void
  back(): void
  openTutor(): void
}

export const CaseSessionContext = createContext<CaseSession | null>(null)

export function useCaseSession(): CaseSession {
  const s = useContext(CaseSessionContext)
  if (!s) throw new Error('Шаг кейса вне плеера')
  return s
}
