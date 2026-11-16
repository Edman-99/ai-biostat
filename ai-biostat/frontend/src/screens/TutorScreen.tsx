import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { CopyQuestion, TUTOR_URL } from '@/screens/player/TutorPanel'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { LearnerShell } from './LearnerShell'

/** Раздел «AI-репетитор»: в пилоте — авторский GPT во внешней вкладке, в системе считаем только переходы. */
export function TutorScreen() {
  const { t } = useTranslation()
  const { research } = useServices()
  const examples = t('tutorPage.examples', { returnObjects: true }) as string[]

  return (
    <LearnerShell>
      <PageHead eyebrow={t('tutorPage.eyebrow')} title={t('tutorPage.title')} lead={t('tutorPage.lead')} />
      <div className="two-col">
        <div>
          <div className="principle">
            <span aria-hidden="true">✦</span>
            <p><b>{t('tutorPage.principleTitle')}</b>{t('tutorPage.principle')}</p>
          </div>
          <a className="btn primary big" href={TUTOR_URL} target="_blank" rel="noopener"
            onClick={() => research.trackSection('tutor_open')}
            style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 18 }}>{t('tutor.open')}</a>
          <ol className="how">
            <li>{t('tutor.how1')}</li><li>{t('tutor.how2')}</li><li>{t('tutorPage.how3')}</li>
          </ol>
          <Note kind="warn">{t('tutorPage.blocked')}</Note>
          <p className="small muted">{t('tutorPage.privacy')}</p>
        </div>
        <div className="panel">
          <h3>{t('tutorPage.examplesTitle')}</h3>
          <p className="small muted">{t('tutorPage.examplesLead')}</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {examples.map(q => <CopyQuestion key={q} q={q} />)}
          </div>
        </div>
      </div>
    </LearnerShell>
  )
}
