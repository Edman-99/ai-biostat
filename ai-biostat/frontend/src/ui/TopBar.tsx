import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useStore } from '@/core/store/useStore'
import { fullName } from '@/core/text'
import { APP_VERSION, BUILD_TIME } from '@/core/version'
import type { Lang } from '@/api/types'

const LANGS: [Lang, string][] = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]

/** onMenu — верхняя панель внутри AppShell: кнопка ☰ (телефон), логотип живёт в боковом меню. */
export function TopBar({ children, onMenu, menuOpen }: { children?: ReactNode; onMenu?: () => void; menuOpen?: boolean }) {
  const { app, language, theme } = useServices()
  const currentTheme = useStore(theme)
  const { me, screen } = useAppState()
  const { t, i18n } = useTranslation()
  return (
    <header className={`top ${onMenu ? 'in-shell' : ''}`}>
      {onMenu && (
        <button className="menu-btn" onClick={onMenu} aria-expanded={!!menuOpen} aria-label={t('nav.menu')}>☰</button>
      )}
      {onMenu && <span className="course-label">{t('nav.course')}</span>}
      <div className="brand"><span className="mark" aria-hidden="true">AB</span><span className="bname">AI-Biostat</span>
        <span className="appver" title={t('common.build', { time: BUILD_TIME })}>v{APP_VERSION}</span></div>
      <div className="ctx">{children}</div>
      <div className="grow" />
      {me && screen !== 'login' && (
        <button className="btn ghost small" title={t('common.profile')} onClick={() => app.openProfile()}>👤 <span className="pname">{fullName(me) || me.code}</span></button>
      )}
      <span className="ver">{t('common.pilot')}</span>
      <button className="theme-btn" onClick={() => theme.toggle()}
        title={t(currentTheme === 'dark' ? 'common.themeLight' : 'common.themeDark')}
        aria-label={t(currentTheme === 'dark' ? 'common.themeLight' : 'common.themeDark')}>
        {currentTheme === 'dark' ? '☀' : '☾'}
      </button>
      <div className="lang" role="group" aria-label={t('common.langGroup')}>
        {LANGS.map(([code, label]) => (
          <button key={code} aria-pressed={i18n.language === code} onClick={() => language.choose(code)}>{label}</button>
        ))}
      </div>
    </header>
  )
}
