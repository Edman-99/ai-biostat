import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { ProgressBar } from '@/ui/common'
import { LearnerShell } from './LearnerShell'

export function DiagnosticResultScreen() {
  const { t } = useTranslation()
  const { app, diagnostic, research } = useServices()
  const { answers, done } = useAppState().diag
  const pct = useMemo(() => diagnostic.percentages(answers), [diagnostic, answers])
  const blockName = (b: string) => t(`blocks.${BLOCK_KEY[b]}`)

  // результат отправляется один раз — при первом показе экрана
  useEffect(() => {
    if (done) return
    research.diagnostic(answers, pct)
    app.finishDiag(pct)
  }, [done, answers, pct, research, app])

  return (
    <LearnerShell>
      <div style={{ maxWidth: 680 }}>
        <p className="eyebrow">{t('nav.diagres')}</p>
        <h1 className="serif">{t('diag.resultTitle')}</h1>
        <p className="muted">{t('diag.growth', { weak: blockName(diagnostic.weakest(pct)) })}</p>
        <div className="panel" style={{ display: 'grid', gap: 14 }}>
          {Object.entries(pct).map(([k, v]) => (
            <div key={k}><div className="spread small"><span>{blockName(k)}</span><b>{v}%</b></div><ProgressBar pct={v} /></div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>{t('diag.exitNote')}</p>
        <div style={{ marginTop: 16 }}><button className="btn primary" onClick={() => app.navigate('cases')}>{t('diag.startCase')}</button></div>
      </div>
    </LearnerShell>
  )
}
