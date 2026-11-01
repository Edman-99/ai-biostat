import { useAppState, useServices } from '@/app/ServicesContext'
import { OptionList, ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

export function DiagnosticScreen() {
  const { app, diagnostic } = useServices()
  const { idx, answers } = useAppState().diag
  const q = diagnostic.question(idx)
  const last = idx === diagnostic.count - 1

  return (
    <>
      <TopBar />
      <main className="center" style={{ maxWidth: 620 }}>
        <div className="spread small muted">
          <span>Входная диагностика · {q.block}</span>
          <span>Вопрос {idx + 1} из {diagnostic.count} <span className="muted">(в полной версии 20, вариант А)</span></span>
        </div>
        <ProgressBar pct={idx / diagnostic.count * 100} style={{ margin: '8px 0 22px' }} />
        <h2>{q.question}</h2>
        <OptionList options={q.options.map(label => ({ label }))} selected={answers[idx]} onSelect={i => app.answerDiag(idx, i)} />
        <p className="small muted">Правильность не показывается — это диагностика, а не экзамен. Можно закрыть и вернуться к этому вопросу.</p>
        <button className="btn primary" disabled={answers[idx] == null}
          onClick={() => (last ? app.navigate('diagres') : app.nextDiagQuestion())}>
          {last ? 'Завершить диагностику' : 'Ответить'}
        </button>
      </main>
    </>
  )
}
