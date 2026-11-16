import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Screen } from '@/app/AppStore'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { BLOCK_KEY, DEFAULT_PCT } from '@/domain/diagnostic/Diagnostic'
import { useStepNames } from '@/screens/player/steps'
import { Note, ProgressBar } from '@/ui/common'
import { LearnerShell } from './LearnerShell'
import { useCaseResults } from './useCaseResults'
import { ExitInvite } from './DiagnosticResultScreen'

const ROUTE: { key: string; icon: string; to: Screen }[] = [
  { key: 'diag', icon: '⌁', to: 'diagres' },
  { key: 'practice', icon: '▦', to: 'cases' },
  { key: 'critical', icon: '✦', to: 'aicheck' },
  { key: 'reflection', icon: '↗', to: 'progress' },
]

export function HomeScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const stepNames = useStepNames()
  const { app, session } = useServices()
  // преподаватель мог открыть итоговую диагностику, пока студент был на сайте
  useEffect(() => { void session.refreshMe() }, [session])
  const { me, diag } = useAppState()
  const pct = diag.pct || DEFAULT_PCT
  const results = useCaseResults()
  // продолжить начатый кейс; если таких нет — первый ещё не пройденный наполненный кейс
  const current = results.find(r => r.status === 'progress') ?? results.find(r => r.status === 'new')
  const roleWord = t(me?.role === 'specialist' ? 'common.specialist' : 'common.student')

  return (
    <LearnerShell>
      <section className="hero">
        <div>
          <p className="eyebrow">{t('overview.eyebrow')}</p>
          <h1 className="serif hero-title">{t('overview.title1')}<br /><em>{t('overview.title2')}</em></h1>
          <p className="lead">{t('overview.lead')}</p>
          <div className="row" style={{ marginTop: 22 }}>
            {current && (
              <button className="btn primary big" onClick={() => app.openCase(current.entry.id)}>
                {current.status === 'progress' ? t('common.cont') : t('home.startCase')} →
              </button>
            )}
            <button className="btn big" onClick={() => app.navigate('cases')}>{t('overview.openCases')}</button>
          </div>
        </div>
        <div className="orbit-visual" aria-hidden="true">
          <span className="orb o1">{t('overview.orbit.data')}</span>
          <span className="orb o2">{t('overview.orbit.method')}</span>
          <span className="orb o3">{t('overview.orbit.conclusion')}</span>
          <div className="orb-core"><b>AI</b><small>{t('overview.orbit.tutor')}</small></div>
        </div>
      </section>

      <ExitInvite />
      <div style={{ marginTop: 26 }}>
        <h2>{me?.first_name ? t('home.helloName', { name: me.first_name }) : t('home.hello')}</h2>
        <p className="muted">{me?.code} · {roleWord}{me?.group ? ` · ${t('common.group', { group: me.group })}` : ''}</p>
        {me && !me.first_name && (
          <Note>{t('home.fillProfile')}{' '}
            <button className="btn ghost" onClick={() => app.openProfile()}>{t('home.openProfile')}</button></Note>
        )}
      </div>

      {current?.progress && current.status === 'progress' && (
        <div className="cont" style={{ marginTop: 14 }}>
          <div>
            <div className="small muted">{t('home.stoppedHere')}</div>
            <h2 style={{ margin: '4px 0' }}>{t('home.caseTitle', { id: current.entry.id, title: pick(current.entry.title, lang) })}</h2>
            <div className="small muted">{t('home.stepOf', { n: current.progress.step, name: stepNames[current.progress.step - 1] })}</div>
            <ProgressBar pct={(current.progress.maxStep - 1) / 10 * 100} />
          </div>
          <button className="btn primary" onClick={() => app.openCase(current.entry.id)}>{t('common.cont')}</button>
        </div>
      )}

      <div className="section-head">
        <div><p className="eyebrow">{t('overview.routeEyebrow')}</p><h2 className="serif">{t('overview.routeTitle')}</h2></div>
        <p className="muted">{t('overview.routeLead')}</p>
      </div>
      <div className="route-grid">
        {ROUTE.map((r, i) => (
          <button key={r.key} className="route-card" onClick={() => app.navigate(r.to)}>
            <span className="route-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="route-icon" aria-hidden="true">{r.icon}</span>
            <b>{t(`overview.route.${r.key}.title`)}</b>
            <span className="small muted">{t(`overview.route.${r.key}.text`)}</span>
          </button>
        ))}
      </div>

      <div className="section-head">
        <div><p className="eyebrow">{t('overview.compEyebrow')}</p><h2 className="serif">{t('overview.compTitle')}</h2></div>
      </div>
      <div className="comps">
        {Object.entries(pct).map(([k, v]) => (
          <div className="comp" key={k}><span className="small muted">{t(`blocks.${BLOCK_KEY[k]}`)}</span><b>{v}%</b><ProgressBar pct={v} /></div>
        ))}
      </div>
      <p className="small muted">{t('home.footer')}</p>
    </LearnerShell>
  )
}
