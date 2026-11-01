import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { fullName } from '@/core/text'
import type { Lang } from '@/api/types'

const LANGS: [Lang, string][] = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]

export function TopBar({ children }: { children?: ReactNode }) {
  const { app, language } = useServices()
  const { me, screen } = useAppState()
  const { i18n } = useTranslation()
  return (
    <header className="top">
      <div className="brand"><span className="mark" aria-hidden="true">AB</span><span className="bname">AI-Biostat</span></div>
      <div className="ctx">{children}</div>
      <div className="grow" />
      {me && screen !== 'login' && (
        <button className="btn ghost small" title="Профиль" onClick={() => app.openProfile()}>👤 {fullName(me) || me.code}</button>
      )}
      <span className="ver">Пилот</span>
      <div className="lang" role="group" aria-label="Язык интерфейса">
        {LANGS.map(([code, label]) => (
          <button key={code} aria-pressed={i18n.language === code} onClick={() => language.choose(code)}>{label}</button>
        ))}
      </div>
    </header>
  )
}
