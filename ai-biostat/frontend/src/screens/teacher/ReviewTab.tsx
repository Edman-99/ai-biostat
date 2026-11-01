import { useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import type { Dispute } from '@/api/types'
import { Note, Who } from '@/ui/common'
import type { OverviewState } from './useOverview'

function DisputeRow({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const { teacher } = useServices()
  const [score, setScore] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const resolve = async (decision: 'keep' | 'change') => {
    if (!reason.trim()) { setError('Нужно обоснование решения'); return }
    try {
      await teacher.resolveDispute(d.id, decision, decision === 'change' && score !== '' ? Number(score) : null, reason.trim())
      onDone()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="qrow" style={{ gridTemplateColumns: '1fr' }}>
      <div>
        <b><Who p={d} /> · кейс {d.case_id} · {d.step}</b> <span className="tag" style={{ color: 'var(--bad)' }}>Оспаривается</span>
        <div className="small muted">Оценка ИИ за кейс: {d.ai_score ?? '—'} · «{d.text}»</div>
      </div>
      <div className="row">
        <input className="t" type="number" min={0} max={100} placeholder="Новый балл" style={{ width: 140 }} value={score} onChange={e => setScore(e.target.value)} />
        <textarea className="t" style={{ minHeight: 44, flex: 1 }} placeholder="Обоснование решения (обязательно)" value={reason}
          onChange={e => { setReason(e.target.value); setError('') }} />
      </div>
      {error && <div className="hint" style={{ color: 'var(--bad)' }}>{error}</div>}
      <div className="row">
        <button className="btn" onClick={() => resolve('keep')}>Оставить оценку</button>
        <button className="btn primary" onClick={() => resolve('change')}>Изменить балл</button>
      </div>
    </div>
  )
}

export function ReviewTab({ overview }: { overview: OverviewState }) {
  const { teacher } = useServices()
  const { data, error, reload } = overview
  const disputes = data?.disputes ?? []
  const pending = (data?.people ?? []).filter(p => p.status === 'completed')

  return (
    <>
      <div className="spread"><h1>Проверка</h1><button className="btn" onClick={reload}>Обновить</button></div>
      <p className="muted">Сначала — оспариваемые оценки. Оспаривание не блокирует студента; решение и обоснование он увидит.</p>
      {error && <Note kind="bad">{error}</Note>}
      {!data && <p className="muted">Загрузка…</p>}

      <h3>Оспаривания ({disputes.length})</h3>
      <div className="panel">
        {disputes.length ? disputes.map(d => <DisputeRow key={d.id} d={d} onDone={reload} />)
          : <p className="muted small" style={{ margin: 0 }}>Открытых оспариваний нет.</p>}
      </div>

      <h3 style={{ marginTop: 22 }}>Ждут подтверждения ({pending.length})</h3>
      <div className="panel">
        {pending.length ? pending.map(p => (
          <div className="qrow" key={`${p.code}|${p.case_id}`}>
            <div><b><Who p={p} /> · кейс {p.case_id}</b> <span className="tag">Предварительная</span>
              <div className="small muted">{p.score ?? '—'} баллов · {p.grade ?? ''}</div></div>
            <button className="btn primary" onClick={() => teacher.confirm(p.code, p.case_id!).then(reload)}>Подтвердить</button>
          </div>
        )) : <p className="muted small" style={{ margin: 0 }}>Нет работ, ожидающих подтверждения.</p>}
      </div>
    </>
  )
}
