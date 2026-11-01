import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { DebriefItem } from '@/domain/scoring/DebriefBuilder'
import { GradeBadge, Modal, Note, ProgressBar } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

function DisputeDialog({ steps, onCancel, onSend }: {
  steps: string[]; onCancel: () => void; onSend: (step: string, text: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState(steps[0])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!text.trim()) { setError(t('step9.argumentEmpty')); return }
    setBusy(true)
    try { await onSend(step, text.trim()) } catch (e) { setError((e as Error).message); setBusy(false) }
  }

  return (
    <Modal titleId="dh">
      <h2 id="dh">{t('step9.dispute')}</h2>
      <p className="muted small">{t('step9.dialogIntro')}</p>
      <label className="f" htmlFor="darg">{t('step9.dialogStep')}</label>
      <select className="t" id="darg" value={step} onChange={e => setStep(e.target.value)}>{steps.map(s => <option key={s}>{s}</option>)}</select>
      <label className="f" htmlFor="dt">{t('step9.argument')}</label>
      <textarea className="t" id="dt" placeholder={t('step9.argumentPh')} value={text} autoFocus
        onChange={e => { setText(e.target.value); setError('') }} />
      {error && <div className="hint" style={{ color: 'var(--bad)' }}>{error}</div>}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={busy} onClick={send}>{t('step9.send')}</button>
      </div>
    </Modal>
  )
}

function BulletList({ items }: { items: DebriefItem[] }) {
  const { t } = useTranslation()
  const label = (i: DebriefItem) => ('key' in i ? t(`debrief.${i.key}`) : i.text)
  return <ul>{items.length ? items.map(i => <li key={label(i)}>{label(i)}</li>) : <li className="muted">{t('common.none')}</li>}</ul>
}

export function Step9Debrief() {
  const { t } = useTranslation()
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
      <h2>{t('step9.title')}</h2>
      <div className="spread">
        <div>
          <div className="score">{sheet.total} <span className="muted" style={{ fontSize: 22 }}>{t('step9.outOf')}</span></div>
          <GradeBadge grade={grades.gradeOf(sheet.total)} />
          <span className="tag">{c.disputed ? t('step9.disputed') : t('step9.prelim')}</span>
        </div>
        <button className="btn" disabled={c.disputed} onClick={() => setDisputeOpen(true)}>{t('step9.dispute')}</button>
      </div>
      <div className="cards3">
        <div className="c3 g"><b>{t('step9.good')}</b><BulletList items={fb.good} /></div>
        <div className="c3 o"><b>{t('step9.bad')}</b><BulletList items={fb.bad} /></div>
        <div className="c3 b"><b>{t('step9.repeat')}</b><BulletList items={fb.repeat} /></div>
      </div>
      <h3>{t('step9.byStep')}</h3>
      <div style={{ display: 'grid', gap: 6, maxWidth: 520 }}>
        {sheet.steps.map(s => (
          <div className="sbar" key={s.key}>
            <div><div className="small">{t(`score.${s.key}`)}</div><ProgressBar pct={s.value / s.max * 100} /></div>
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
