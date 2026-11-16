import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { BLOCKS } from '@/domain/progress/Competencies'
import { Note, ProgressBar } from '@/ui/common'
import { LearnerShell } from './LearnerShell'

/** Карточка «итоговая диагностика открыта» — на этом экране и на главной. */
export function ExitInvite() {
  const { t } = useTranslation()
  const { app } = useServices()
  const { me, exit } = useAppState()
  if (!me?.exit_open || exit.done) return null
  return (
    <div className="cont" style={{ margin: '16px 0' }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>{t('diag.exitEyebrow')}</p>
        <h2 style={{ margin: '0 0 4px' }}>{t('diag.exitOpenTitle')}</h2>
        <p className="small muted" style={{ margin: 0 }}>{t('diag.exitOpenText')}</p>
      </div>
      <button className="btn primary" onClick={() => app.startExitDiag()}>{t('diag.exitStart')} →</button>
    </div>
  )
}

export function DiagnosticResultScreen() {
  const { t } = useTranslation()
  const { app, session, diagnostic, exitDiagnostic } = useServices()
  const { diag, exit } = useAppState()
  const blockName = (b: string) => t(`blocks.${BLOCK_KEY[b]}`)
  const entryPct = diag.pct ?? diagnostic.percentages(diag.answers)

  // преподаватель мог открыть итоговую диагностику, пока студент был на сайте
  useEffect(() => { void session.refreshMe() }, [session])

  return (
    <LearnerShell>
      <div style={{ maxWidth: 720 }}>
        <p className="eyebrow">{t('nav.diagres')}</p>
        {exit.done && exit.pct ? (
          <>
            <h1 className="serif">{t('diag.compareTitle')}</h1>
            <p className="muted">{t('diag.compareLead')}</p>
            <div className="panel">
              <div className="dual-bars" style={{ marginTop: 0 }}>
                {BLOCKS.map(b => (
                  <div key={b}>
                    <span>{blockName(b)}</span>
                    <i><b style={{ width: `${entryPct[b] ?? 0}%` }} /><em style={{ width: `${exit.pct![b] ?? 0}%` }} /></i>
                    <strong>{entryPct[b] ?? 0}% → {exit.pct![b] ?? 0}%</strong>
                  </div>
                ))}
              </div>
              <div className="legend"><span><i className="l-entry" />{t('diag.entry')}</span><span><i className="l-now" />{t('diag.exit')}</span></div>
              <p style={{ marginTop: 14, marginBottom: 0 }}><b>{t('diag.total', {
                a: diagnostic.score(diag.answers), b: exitDiagnostic.score(exit.answers), n: diagnostic.count,
              })}</b></p>
            </div>
            <Note kind="ok">{t('diag.exitDone')}</Note>
          </>
        ) : (
          <>
            <h1 className="serif">{t('diag.resultTitle')}</h1>
            <p className="muted">{t('diag.growth', { weak: blockName(diagnostic.weakest(entryPct)) })}</p>
            <ExitInvite />
            <div className="panel" style={{ display: 'grid', gap: 14 }}>
              {Object.entries(entryPct).map(([k, v]) => (
                <div key={k}><div className="spread small"><span>{blockName(k)}</span><b>{v}%</b></div><ProgressBar pct={v} /></div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>{t('diag.exitNote')}</p>
            <div style={{ marginTop: 16 }}><button className="btn primary" onClick={() => app.navigate('cases')}>{t('diag.startCase')}</button></div>
          </>
        )}
      </div>
    </LearnerShell>
  )
}
