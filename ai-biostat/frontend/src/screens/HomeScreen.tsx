import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { PILOT_CATALOG } from '@/cases/CaseRegistry'
import { DEFAULT_PCT } from '@/domain/diagnostic/Diagnostic'
import { STEP_NAMES } from '@/screens/player/steps'
import { Note, ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

export function HomeScreen() {
  const { app, session, cases } = useServices()
  const { me, diag, activeCaseId } = useAppState()
  const { t } = useTranslation()
  const pct = diag.pct || DEFAULT_PCT
  const def = cases.get(activeCaseId)!
  const c = app.caseProgress(activeCaseId)
  const started = c.maxStep > 1
  const isSpecialist = me?.role === 'specialist'

  return (
    <>
      <TopBar><button className="btn ghost small" onClick={() => session.logout()}>{t('logout')}</button></TopBar>
      <main className="wrap home">
        <nav className="nav" aria-label="Разделы">
          <button aria-current="page">{t('home')}</button><button>{t('cases')}</button><button>Анализ данных</button>
          <button>{t('aicheck')}</button><button>{t('progress')}</button>
        </nav>
        <div>
          <h1>Здравствуйте{me?.first_name ? `, ${me.first_name}` : ''}</h1>
          {me && !me.first_name && (
            <Note>Укажите имя и фамилию в профиле, чтобы преподаватель видел, чья это работа.{' '}
              <button className="btn ghost" onClick={() => app.openProfile()}>Открыть профиль</button></Note>
          )}
          <p className="muted">{me?.code} · {isSpecialist ? 'специалист' : 'студент'}{me?.group ? ` · группа ${me.group}` : ''}</p>

          <div className="cont">
            <div>
              <div className="small muted">{started ? 'Вы остановились здесь' : 'Рекомендуемый первый кейс'}</div>
              <h2 style={{ margin: '4px 0' }}>Кейс {def.id}. {def.title}</h2>
              <div className="small muted">Шаг {c.step} из 10 · {STEP_NAMES[c.step - 1]}</div>
              <ProgressBar pct={(c.maxStep - 1) / 10 * 100} style={{ width: 260, marginTop: 10 }} />
            </div>
            <button className="btn primary" onClick={() => app.openCase(def.id)}>{started ? t('cont') : 'Начать кейс'}</button>
          </div>

          <div className="comps">
            {Object.entries(pct).map(([k, v]) => (
              <div className="comp" key={k}><span className="small muted">{k}</span><b>{v}%</b><ProgressBar pct={v} /></div>
            ))}
          </div>

          <h3>Кейсы пилота</h3>
          <div className="cases">
            {PILOT_CATALOG.map(e => {
              const open = cases.has(e.id)
              return (
                <button key={e.id} className={`case ${open ? '' : 'locked'}`} aria-disabled={!open || undefined}
                  onClick={() => open && app.openCase(e.id)}>
                  <span className="n">{e.id}</span>
                  <span><b>{e.title}</b><br /><span className="small muted">{e.methods}{open ? '' : ' · в прототипе не наполнен'}</span></span>
                  <span className="tag">{e.level}</span>
                </button>
              )
            })}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Все кейсы пилота содержат только учебные данные. Остальные 25 кейсов каталога — после пилота.</p>
        </div>
      </main>
    </>
  )
}
