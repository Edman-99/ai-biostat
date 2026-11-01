import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { PILOT_CATALOG, catalogEntry } from '@/cases/CaseRegistry'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { BLOCK_KEY, DEFAULT_PCT } from '@/domain/diagnostic/Diagnostic'
import { useStepNames } from '@/screens/player/steps'
import { Note, ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

export function HomeScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const stepNames = useStepNames()
  const { app, session, cases } = useServices()
  const { me, diag, activeCaseId } = useAppState()
  const pct = diag.pct || DEFAULT_PCT
  const def = cases.get(activeCaseId)!
  const entry = catalogEntry(def.id)
  const c = app.caseProgress(activeCaseId)
  const started = c.maxStep > 1
  const roleWord = t(me?.role === 'specialist' ? 'common.specialist' : 'common.student')

  return (
    <>
      <TopBar><button className="btn ghost small" onClick={() => session.logout()}>{t('common.logout')}</button></TopBar>
      <main className="wrap home">
        <nav className="nav" aria-label={t('home.nav.label')}>
          <button aria-current="page">{t('home.nav.home')}</button><button>{t('home.nav.cases')}</button><button>{t('home.nav.analysis')}</button>
          <button>{t('home.nav.aicheck')}</button><button>{t('home.nav.progress')}</button>
        </nav>
        <div>
          <h1>{me?.first_name ? t('home.helloName', { name: me.first_name }) : t('home.hello')}</h1>
          {me && !me.first_name && (
            <Note>{t('home.fillProfile')}{' '}
              <button className="btn ghost" onClick={() => app.openProfile()}>{t('home.openProfile')}</button></Note>
          )}
          <p className="muted">{me?.code} · {roleWord}{me?.group ? ` · ${t('common.group', { group: me.group })}` : ''}</p>

          <div className="cont">
            <div>
              <div className="small muted">{started ? t('home.stoppedHere') : t('home.recommended')}</div>
              <h2 style={{ margin: '4px 0' }}>{t('home.caseTitle', { id: def.id, title: entry ? pick(entry.title, lang) : def.title })}</h2>
              <div className="small muted">{t('home.stepOf', { n: c.step, name: stepNames[c.step - 1] })}</div>
              <ProgressBar pct={(c.maxStep - 1) / 10 * 100} style={{ width: 260, marginTop: 10 }} />
            </div>
            <button className="btn primary" onClick={() => app.openCase(def.id)}>{started ? t('common.cont') : t('home.startCase')}</button>
          </div>

          <div className="comps">
            {Object.entries(pct).map(([k, v]) => (
              <div className="comp" key={k}><span className="small muted">{t(`blocks.${BLOCK_KEY[k]}`)}</span><b>{v}%</b><ProgressBar pct={v} /></div>
            ))}
          </div>

          <h3>{t('home.pilotCases')}</h3>
          <div className="cases">
            {PILOT_CATALOG.map(e => {
              const open = cases.has(e.id)
              return (
                <button key={e.id} className={`case ${open ? '' : 'locked'}`} aria-disabled={!open || undefined}
                  onClick={() => open && app.openCase(e.id)}>
                  <span className="n">{e.id}</span>
                  <span><b>{pick(e.title, lang)}</b><br /><span className="small muted">{pick(e.methods, lang)}{open ? '' : ` · ${t('home.notFilled')}`}</span></span>
                  <span className="tag">{t(`home.level.${e.level}`)}</span>
                </button>
              )
            })}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>{t('home.footer')}</p>
        </div>
      </main>
    </>
  )
}
