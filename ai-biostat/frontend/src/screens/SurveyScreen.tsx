import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { LEARNER_SURVEY } from '@/domain/survey/Survey'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { SurveyForm } from '@/ui/SurveyForm'
import { LearnerShell } from './LearnerShell'

/** Ответил ли участник на опросник (null — ещё не знаем). */
function useSurveyDone(): [boolean | null, () => void] {
  const { survey } = useServices()
  const [done, setDone] = useState<boolean | null>(null)
  useEffect(() => { survey.mine().then(r => setDone(r.done)).catch(() => setDone(false)) }, [survey])
  return [done, () => setDone(true)]
}

/** Приглашение на главной: опросник открыт преподавателем и ещё не заполнен. */
export function SurveyInvite() {
  const { t } = useTranslation()
  const { app } = useServices()
  const { me } = useAppState()
  const [done] = useSurveyDone()
  if (!me?.survey_open || done !== false) return null
  return (
    <div className="cont" style={{ margin: '16px 0' }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>{t('survey.eyebrow')}</p>
        <h2 style={{ margin: '0 0 4px' }}>{t('survey.inviteTitle')}</h2>
        <p className="small muted" style={{ margin: 0 }}>{t('survey.inviteText')}</p>
      </div>
      <button className="btn primary" onClick={() => app.navigate('survey')}>{t('survey.start')} →</button>
    </div>
  )
}

export function SurveyScreen() {
  const { t } = useTranslation()
  const { me } = useAppState()
  const [done, markDone] = useSurveyDone()
  return (
    <LearnerShell>
      <PageHead eyebrow={t('survey.eyebrow')} title={t('survey.title')} lead={t('survey.lead')} />
      {done === null ? <p className="muted">{t('common.loading')}</p>
        : done ? <Note kind="ok">{t('survey.thanks')}</Note>
          : !me?.survey_open ? <Note>{t('survey.closed')}</Note>
            : <SurveyForm sections={LEARNER_SURVEY} onDone={markDone} />}
    </LearnerShell>
  )
}
