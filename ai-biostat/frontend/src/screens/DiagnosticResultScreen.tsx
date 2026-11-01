import { useEffect, useMemo } from 'react'
import { useAppState, useServices } from '@/app/ServicesContext'
import { ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

export function DiagnosticResultScreen() {
  const { app, diagnostic, research } = useServices()
  const { answers, done } = useAppState().diag
  const pct = useMemo(() => diagnostic.percentages(answers), [diagnostic, answers])

  // результат отправляется один раз — при первом показе экрана
  useEffect(() => {
    if (done) return
    research.diagnostic(answers, pct)
    app.finishDiag(pct)
  }, [done, answers, pct, research, app])

  return (
    <>
      <TopBar />
      <main className="center" style={{ maxWidth: 620 }}>
        <h1>Ваш стартовый уровень</h1>
        <p className="muted">Зона роста — «{diagnostic.weakest(pct)}». Репетитор будет чаще задавать вопросы по этой теме.</p>
        <div className="panel" style={{ display: 'grid', gap: 14 }}>
          {Object.entries(pct).map(([k, v]) => (
            <div key={k}><div className="spread small"><span>{k}</span><b>{v}%</b></div><ProgressBar pct={v} /></div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}><button className="btn primary" onClick={() => app.navigate('home')}>Начать первый кейс</button></div>
      </main>
    </>
  )
}
