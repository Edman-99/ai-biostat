import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import type { Dispute } from '@/api/types'
import { Note, Who } from '@/ui/common'
import type { OverviewState } from './useOverview'

function DisputeRow({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const [score, setScore] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const resolve = async (decision: 'keep' | 'change') => {
    if (!reason.trim()) { setError(t('teacher.review.reasonRequired')); return }
    try {
      await teacher.resolveDispute(d.id, decision, decision === 'change' && score !== '' ? Number(score) : null, reason.trim())
      onDone()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="qrow" style={{ gridTemplateColumns: '1fr' }}>
      <div>
        <b><Who p={d} /> · {t('teacher.review.case', { id: d.case_id })} · {d.step}</b> <span className="tag" style={{ color: 'var(--bad)' }}>{t('teacher.review.disputedTag')}</span>
        <div className="small muted">{t('teacher.review.aiScore', { score: d.ai_score ?? '—' })} · «{d.text}»</div>
      </div>
      <div className="row">
        <input className="t" type="number" min={0} max={100} placeholder={t('teacher.review.newScore')} style={{ width: 140 }} value={score} onChange={e => setScore(e.target.value)} />
        <textarea className="t" style={{ minHeight: 44, flex: 1 }} placeholder={t('teacher.review.reason')} value={reason}
          onChange={e => { setReason(e.target.value); setError('') }} />
      </div>
      {error && <div className="hint" style={{ color: 'var(--bad)' }}>{error}</div>}
      <div className="row">
        <button className="btn" onClick={() => resolve('keep')}>{t('teacher.review.keep')}</button>
        <button className="btn primary" onClick={() => resolve('change')}>{t('teacher.review.change')}</button>
      </div>
    </div>
  )
}

export function ReviewTab({ overview }: { overview: OverviewState }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const { data, error, reload } = overview
  const disputes = data?.disputes ?? []
  const pending = (data?.people ?? []).filter(p => p.status === 'completed')

  return (
    <>
      <div className="spread"><h1>{t('teacher.tabs.review')}</h1><button className="btn" onClick={reload}>{t('common.refresh')}</button></div>
      <p className="muted">{t('teacher.review.intro')}</p>
      {error && <Note kind="bad">{error}</Note>}
      {!data && <p className="muted">{t('common.loading')}</p>}

      <h3>{t('teacher.review.disputes', { n: disputes.length })}</h3>
      <div className="panel">
        {disputes.length ? disputes.map(d => <DisputeRow key={d.id} d={d} onDone={reload} />)
          : <p className="muted small" style={{ margin: 0 }}>{t('teacher.review.noDisputes')}</p>}
      </div>

      <h3 style={{ marginTop: 22 }}>{t('teacher.review.pending', { n: pending.length })}</h3>
      <div className="panel">
        {pending.length ? pending.map(p => (
          <div className="qrow" key={`${p.code}|${p.case_id}`}>
            <div><b><Who p={p} /> · {t('teacher.review.case', { id: p.case_id })}</b> <span className="tag">{t('teacher.review.prelimTag')}</span>
              <div className="small muted">{t('teacher.review.points', { score: p.score ?? '—' })} · {p.grade ?? ''}</div></div>
            <button className="btn primary" onClick={() => teacher.confirm(p.code, p.case_id!).then(reload)}>{t('teacher.review.confirm')}</button>
          </div>
        )) : <p className="muted small" style={{ margin: 0 }}>{t('teacher.review.noPending')}</p>}
      </div>
    </>
  )
}
