import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { TopBar } from '@/ui/TopBar'
import { DiagnosticsTab } from './DiagnosticsTab'
import { EditorTab } from './EditorTab'
import { ParticipantsTab } from './ParticipantsTab'
import { ReviewTab } from './ReviewTab'
import { useOverview } from './useOverview'

type Tab = 'review' | 'editor' | 'diag' | 'groups'

export function TeacherScreen() {
  const { t } = useTranslation()
  const { session } = useServices()
  const [tab, setTab] = useState<Tab>('review')
  const overview = useOverview()
  const openDisputes = overview.data?.disputes.length ?? 0

  const tabs: [Tab, React.ReactNode][] = [
    ['review', <>Проверка{openDisputes > 0 && <> <span className="tag">{openDisputes}</span></>}</>],
    ['editor', 'Редактор кейсов'], ['diag', 'Диагностика'], ['groups', 'Участники и выгрузка'],
  ]

  return (
    <>
      <TopBar><button className="btn ghost small" onClick={() => session.logout()}>{t('logout')}</button></TopBar>
      <main className="wrap home">
        <nav className="nav wrap-tabs">
          {tabs.map(([k, label]) => (
            <button key={k} aria-current={tab === k ? 'page' : undefined}
              onClick={() => { setTab(k); if (k === 'review' || k === 'groups') overview.reload() }}>{label}</button>
          ))}
        </nav>
        <div>
          {tab === 'review' && <ReviewTab overview={overview} />}
          {tab === 'editor' && <EditorTab />}
          {tab === 'diag' && <DiagnosticsTab />}
          {tab === 'groups' && <ParticipantsTab overview={overview} />}
        </div>
      </main>
    </>
  )
}
