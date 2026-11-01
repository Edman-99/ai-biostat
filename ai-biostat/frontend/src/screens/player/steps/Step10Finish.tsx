import { useServices } from '@/app/ServicesContext'
import { Note } from '@/ui/common'
import { useCaseSession } from '../CaseSession'

export function Step10Finish() {
  const { app, scorer, grades } = useServices()
  const { def, progress: c, level } = useCaseSession()
  const total = scorer.score(def, c, level).total
  const g = grades.gradeOf(total)
  const other = c.lang === 'R' ? 'Python' : 'R'
  const code = def.code.templates[other].join('\n').replace(/\[(\d)\]/g, (_, i) => def.code.blankAnswers[Number(i)])
  const next = total >= 85 ? 'Следующий кейс (сложнее)' : total >= 70 ? 'Следующий кейс' : 'Пройти ещё раз на новых данных'

  return (
    <>
      <h2>Шаг 10. Кейс завершён</h2>
      <p>Итог: <b>{total} из 100 · {g.letter} ({g.label})</b>, предварительно. Уведомление о решении преподавателя придёт в приложение и на e-mail.</p>
      <Note>Теперь доступен код на {other} для сравнения:</Note>
      <div className="editor">{code}</div>
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn primary" onClick={() => app.navigate('home')}>{next}</button>
        <button className="btn">Скачать отчёт PDF</button>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>В прототипе следующий кейс не наполнен — кнопка ведёт на главную.</p>
    </>
  )
}
