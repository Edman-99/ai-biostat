import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useStore } from '@/core/store/useStore'
import type { CaseProgress } from '@/domain/progress/types'
import { TopBar } from '@/ui/TopBar'
import { CaseSessionContext, type CaseSession } from './CaseSession'
import { catalogEntry } from '@/cases/CaseRegistry'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { STEP_COMPONENTS, useStepNames } from './steps'
import { TutorPanel } from './TutorPanel'

export function PlayerScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const STEP_NAMES = useStepNames()
  const { app, cases, research, saver } = useServices()
  const { activeCaseId, tutorOpen, cases: progressById } = useAppState()
  const saveStatus = useStore(saver)
  const def = cases.get(activeCaseId)!
  const progress = progressById[activeCaseId] ?? app.caseProgress(activeCaseId)
  const level = app.level()
  const entry = catalogEntry(def.id)
  const shortTitle = entry ? pick(entry.shortTitle, lang) : def.shortTitle

  const patch = useCallback(
    (p: Partial<CaseProgress> | ((c: CaseProgress) => Partial<CaseProgress>)) => app.patchCase(activeCaseId, p),
    [app, activeCaseId])

  const go = useCallback((n: number) => {
    research.track('step_enter', { from: app.caseProgress(activeCaseId).step, to: n })
    app.goToStep(activeCaseId, n)
    window.scrollTo(0, 0)
  }, [app, research, activeCaseId])

  const session = useMemo<CaseSession>(() => ({
    def, progress, level, patch, go,
    back: () => go(progress.step - 1),
    openTutor: () => app.setTutorOpen(true),
  }), [def, progress, level, patch, go, app])

  // Ctrl+L — показать/скрыть репетитора
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); app.toggleTutor() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [app])

  const Step = STEP_COMPONENTS[progress.step - 1]
  const jump = (n: number) => { if (n <= progress.maxStep) patch({ step: n }) }

  return (
    <CaseSessionContext.Provider value={session}>
      <TopBar>
        <button className="btn ghost small" onClick={() => app.navigate('home')}>{t('player.backToHome', { id: def.id, title: shortTitle })}</button>
        <span className="small muted stepof">{t('player.stepOf', { n: progress.step })} · <span>{t(`player.save.${saveStatus}`)}</span></span>
      </TopBar>
      <div className="player">
        <nav className="steps" aria-label={t('player.stepsLabel')}>
          <ol>
            {STEP_NAMES.map((name, i) => {
              const n = i + 1, done = n < progress.maxStep, cur = n === progress.step
              return (
                <li key={n}>
                  <button disabled={n > progress.maxStep} aria-current={cur ? 'step' : undefined}
                    title={n > progress.maxStep ? t('player.opensAfter', { n: n - 1 }) : ''} onClick={() => jump(n)}>
                    <span className={`sd ${done ? 'done' : ''} ${cur ? 'cur' : ''}`}>{done ? '✓' : n}</span><span className="lbl">{name}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {progress.locked && <p className="small muted" style={{ padding: 10 }}>{t('player.lockedNote')}</p>}
        </nav>
        <div className="mstep">
          <div className="spread small">
            <b>{t('player.stepOf', { n: progress.step })} · {STEP_NAMES[progress.step - 1]}</b>
            {progress.locked && <span className="muted">{t('player.lockedShort')}</span>}
          </div>
          <div className="seg10">
            {STEP_NAMES.map((name, i) => (
              <button key={i} className={`${i + 1 < progress.maxStep ? 'done' : ''} ${i + 1 === progress.step ? 'cur' : ''}`}
                disabled={i + 1 > progress.maxStep} aria-label={t('player.stepAria', { n: i + 1, name })} onClick={() => jump(i + 1)} />
            ))}
          </div>
        </div>
        <main className="stage">
          <div className="edu"><b>{t('player.eduTitle')}</b> {t('player.eduText')}</div>
          <Step key={progress.step} />
        </main>
        <TutorPanel open={tutorOpen} onClose={() => app.setTutorOpen(false)} />
      </div>
      <div className={`backdrop ${tutorOpen ? 'open' : ''}`} onClick={() => app.setTutorOpen(false)} />
      <button className="tutor-fab" onClick={() => app.toggleTutor()}>💬 {t('tutor.title')}</button>
    </CaseSessionContext.Provider>
  )
}
