import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { AppShell } from '@/ui/AppShell'
import { AnalyticsTab } from './AnalyticsTab'
import { DiagnosticsTab } from './DiagnosticsTab'
import { EditorTab } from './EditorTab'
import { ParticipantsTab } from './ParticipantsTab'
import { ReviewTab } from './ReviewTab'
import { useOverview } from './useOverview'

type Tab = 'review' | 'analytics' | 'groups' | 'editor' | 'diag'
const TABS: Tab[] = ['review', 'analytics', 'groups', 'editor', 'diag']

export function TeacherScreen() {
  const { t } = useTranslation()
  const { session } = useServices()
  const [tab, setTab] = useState<Tab>('review')
  const overview = useOverview()
  const openDisputes = overview.data?.disputes.length ?? 0

  const select = (k: string) => {
    setTab(k as Tab)
    if (k === 'review' || k === 'groups') overview.reload()
  }

  return (
    <AppShell
      items={TABS.map(k => ({
        key: k,
        label: t(`teacher.tabs.${k}`),
        badge: k === 'review' && openDisputes > 0 ? <span className="side-badge">{openDisputes}</span> : undefined,
      }))}
      current={tab}
      onSelect={select}
      topExtra={<button className="btn ghost small" onClick={() => session.logout()}>{t('common.logout')}</button>}
    >
      {tab === 'review' && <ReviewTab overview={overview} />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'editor' && <EditorTab />}
      {tab === 'diag' && <DiagnosticsTab />}
      {tab === 'groups' && <ParticipantsTab overview={overview} />}
    </AppShell>
  )
}
