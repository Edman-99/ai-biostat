import { useMemo, useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import { GradeBadge, Modal, Note, ProgressBar } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

function DisputeDialog({ steps, onCancel, onSend }: {
  steps: string[]; onCancel: () => void; onSend: (step: string, text: string) => Promise<void>
}) {
  const [step, setStep] = useState(steps[0])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!text.trim()) { setError('Напишите аргументацию'); return }
    setBusy(true)
    try { await onSend(step, text.trim()) } catch (e) { setError((e as Error).message); setBusy(false) }
  }

  return (
    <Modal titleId="dh">
      <h2 id="dh">Оспорить оценку</h2>
      <p className="muted small">Ваш ответ, оценка ИИ и аргументация уйдут автору исследования или назначенному преподавателю. До решения оценка имеет статус «оспаривается», но вы можете продолжать обучение. Решение и его обоснование появятся здесь.</p>
      <label className="f" htmlFor="darg">Шаг</label>
      <select className="t" id="darg" value={step} onChange={e => setStep(e.target.value)}>{steps.map(s => <option key={s}>{s}</option>)}</select>
      <label className="f" htmlFor="dt">Аргументация</label>
      <textarea className="t" id="dt" placeholder="Почему вы не согласны с оценкой" value={text} autoFocus
        onChange={e => { setText(e.target.value); setError('') }} />
      {error && <div className="hint" style={{ color: 'var(--bad)' }}>{error}</div>}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>Отмена</button>
        <button className="btn primary" disabled={busy} onClick={send}>Отправить преподавателю</button>
      </div>
    </Modal>
  )
}

const BulletList = ({ items }: { items: string[] }) =>
  <ul>{items.length ? items.map(x => <li key={x}>{x}</li>) : <li className="muted">Нет</li>}</ul>

export function Step9Debrief() {
  const { scorer, grades, debrief, disputes } = useServices()
  const { def, progress: c, level, patch, go } = useCaseSession()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const sheet = useMemo(() => scorer.score(def, c, level), [scorer, def, c, level])
  const fb = useMemo(() => debrief.build(def, c, sheet), [debrief, def, c, sheet])

  const sendDispute = async (step: string, text: string) => {
    await disputes.open(def.id, step, text, sheet.total)
    setDisputeOpen(false)
    patch({ disputed: true })
  }

  return (
    <>
      <h2>Шаг 9. Дебрифинг</h2>
      <div className="spread">
        <div>
          <div className="score">{sheet.total} <span className="muted" style={{ fontSize: 22 }}>/ 100</span></div>
          <GradeBadge grade={grades.gradeOf(sheet.total)} />
          <span className="tag">{c.disputed
            ? 'Оспаривается · оценка предварительная, переход дальше не блокируется'
            : 'Предварительная оценка · ждёт подтверждения преподавателя'}</span>
        </div>
        <button className="btn" disabled={c.disputed} onClick={() => setDisputeOpen(true)}>Оспорить оценку</button>
      </div>
      <div className="cards3">
        <div className="c3 g"><b>Получилось</b><BulletList items={fb.good} /></div>
        <div className="c3 o"><b>Ошибки</b><BulletList items={fb.bad} /></div>
        <div className="c3 b"><b>Повторить</b><BulletList items={fb.repeat} /></div>
      </div>
      <h3>Баллы по шагам</h3>
      <div style={{ display: 'grid', gap: 6, maxWidth: 520 }}>
        {sheet.steps.map(s => (
          <div className="sbar" key={s.key}>
            <div><div className="small">{s.label}</div><ProgressBar pct={s.value / s.max * 100} /></div>
            <b className="small">{s.value} / {s.max}</b>
          </div>
        ))}
      </div>
      <Note style={{ marginTop: 18 }}>{def.debrief.referenceConclusion}</Note>
      {disputeOpen && <DisputeDialog steps={def.debrief.disputeSteps} onCancel={() => setDisputeOpen(false)} onSend={sendDispute} />}
      <StepFooter canNext showBack={false} onNext={() => go(10)} />
    </>
  )
}
