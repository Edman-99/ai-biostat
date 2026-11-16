import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { ChatMessage } from '@/api/TutorApi'
import { CopyQuestion, TUTOR_URL } from '@/screens/player/TutorPanel'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { TutorChat, useTutorStatus } from '@/ui/TutorChat'
import { LearnerShell } from './LearnerShell'

/** Раздел «AI-репетитор»: встроенный чат (Claude Haiku через наш сервер); без него — ссылка на авторский GPT. */
export function TutorScreen() {
  const { t } = useTranslation()
  const { research } = useServices()
  const status = useTutorStatus()
  const [chat, setChat] = useState<ChatMessage[]>([])
  const examples = t('tutorPage.examples', { returnObjects: true }) as string[]
  const gpt = (
    <a className={status?.enabled ? 'small' : 'btn primary big'} href={TUTOR_URL} target="_blank" rel="noopener"
      onClick={() => research.trackSection('tutor_open')}
      style={status?.enabled ? undefined : { textDecoration: 'none', display: 'inline-flex', marginTop: 18 }}>
      {status?.enabled ? t('tutor.chat.gptLink') : t('tutor.open')}
    </a>
  )

  return (
    <LearnerShell>
      <PageHead eyebrow={t('tutorPage.eyebrow')} title={t('tutorPage.title')} lead={t('tutorPage.lead')} />
      <div className="two-col">
        <div>
          <div className="principle">
            <span aria-hidden="true">✦</span>
            <p><b>{t('tutorPage.principleTitle')}</b>{t('tutorPage.principle')}</p>
          </div>
          {!status?.enabled && gpt}
          {!status?.enabled && <ol className="how"><li>{t('tutor.how1')}</li><li>{t('tutor.how2')}</li><li>{t('tutorPage.how3')}</li></ol>}
          <Note kind="warn">{t('tutorPage.blocked')}</Note>
          <p className="small muted">{status?.enabled ? t('tutor.chat.privacy') : t('tutorPage.privacy')}</p>
          {status?.enabled && <p>{gpt}</p>}
        </div>
        {status?.enabled ? (
          <div className="panel tutor-page-chat">
            <TutorChat caseId={null} step={null} context={t('tutorPage.title')} messages={chat} onChange={setChat}
              quick={examples} initialLeft={status.left} />
          </div>
        ) : (
          <div className="panel">
            <h3>{t('tutorPage.examplesTitle')}</h3>
            <p className="small muted">{t('tutorPage.examplesLead')}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {examples.map(q => <CopyQuestion key={q} q={q} />)}
            </div>
          </div>
        )}
      </div>
    </LearnerShell>
  )
}
