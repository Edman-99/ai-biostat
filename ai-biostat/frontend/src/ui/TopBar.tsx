import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { fullName } from '@/core/text'
import { APP_VERSION, BUILD_TIME } from '@/core/version'
import type { Lang } from '@/api/types'

const LANGS: [Lang, string][] = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]

export function TopBar({ children }: { children?: ReactNode }) {
  const { app, language } = useServices()
  const { me, screen } = useAppState()
  const { i18n } = useTranslation()
  return (
    <header className="top">
      <div className="brand"><span className="mark" aria-hidden="true">AB</span><span className="bname">AI-Biostat</span>
        <span className="appver" title={`Сборка от ${BUILD_TIME}`}>v{APP_VERSION}</span></div>
      <div className="ctx">{children}</div>
      <div className="grow" />
      {me && screen !== 'login' && (
        <button className="btn ghost small" title="Профиль" onClick={() => app.openProfile()}>👤 <span className="pname">{fullName(me) || me.code}</span></button>
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
