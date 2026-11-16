import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LEARNER_SECTIONS, type Screen } from '@/app/AppStore'
import { useAppState, useServices } from '@/app/ServicesContext'
import { AppShell } from '@/ui/AppShell'

/** Разделы студента и специалиста: Обзор, Диагностика, Кейсы, Репетитор, Анализ, Проверка ИИ, Прогресс. */
export function LearnerShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { app, session } = useServices()
  const { screen } = useAppState()
  return (
    <AppShell
      items={LEARNER_SECTIONS.map(s => ({ key: s, label: t(`nav.${s}`) }))}
      current={screen}
      onSelect={key => app.navigate(key as Screen)}
      topExtra={<button className="btn ghost small" onClick={() => session.logout()}>{t('common.logout')}</button>}
    >
      {children}
    </AppShell>
  )
}
