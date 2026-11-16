import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { wordCount } from '@/core/text'
import { MIN_REASON_WORDS, VERDICTS, type CheckOutcome, type Verdict } from '@/domain/aicheck/AiCheckTrainer'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { LearnerShell } from './LearnerShell'

const OUTCOME_KIND: Record<CheckOutcome, 'ok' | 'warn' | 'bad'> = { ok: 'ok', tooShort: 'warn', weakReason: 'warn', wrongVerdict: 'bad' }

export function AiCheckScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const { app, aiCheck, research } = useServices()
  const { trainer } = useAppState()
  const tasks = aiCheck.tasks
  const [idx, setIdx] = useState(() => Math.max(0, tasks.findIndex(x => !trainer[x.id]?.ok)))
  const task = tasks[idx]
  const saved = trainer[task.id]
  const [verdict, setVerdict] = useState<Verdict | null>(saved?.verdict ?? null)
  const [reason, setReason] = useState(saved?.reason ?? '')
  const [outcome, setOutcome] = useState<CheckOutcome | null>(saved?.ok ? 'ok' : null)

  const goTo = (i: number) => {
    const s = trainer[tasks[i].id]
    setIdx(i); setVerdict(s?.verdict ?? null); setReason(s?.reason ?? ''); setOutcome(s?.ok ? 'ok' : null)
  }

  const check = () => {
    if (!verdict) return
    const res = aiCheck.evaluate(task, verdict, reason)
    setOutcome(res)
    app.saveTrainerAnswer(task.id, { verdict, reason, ok: res === 'ok' })
    research.trackSection('aicheck_answer', { task: task.id, outcome: res })
  }

  const showExplanation = outcome === 'ok' || (saved?.tries ?? 0) >= 2
  const solved = tasks.filter(x => trainer[x.id]?.ok).length

  return (
    <LearnerShell>
      <PageHead eyebrow={t('aicheck.eyebrow')} title={t('aicheck.title')} lead={t('aicheck.lead')}
        aside={<span className="pill">{t('aicheck.counter', { n: idx + 1, total: tasks.length })}</span>} />

      <div className="task-tabs" role="tablist">
        {tasks.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === idx} className={trainer[x.id]?.ok ? 'solved' : ''} onClick={() => goTo(i)}>
            {trainer[x.id]?.ok ? '✓ ' : ''}{t('aicheck.task', { n: i + 1 })}
          </button>
        ))}
        <span className="small muted" style={{ alignSelf: 'center' }}>{t('aicheck.solved', { n: solved, total: tasks.length })}</span>
      </div>

      <div className="critical-grid">
        <div className="panel">
          <div className="answer-label"><span aria-hidden="true">Ai</span>{t('aicheck.aiAnswer')}</div>
          <blockquote className="ai-quote">«{pick(task.statement, lang)}»</blockquote>
          <p className="small">{t('aicheck.chooseVerdict')}</p>
          <div className="verdicts" role="radiogroup">
            {VERDICTS.map(v => (
              <button key={v} role="radio" aria-checked={verdict === v} onClick={() => { setVerdict(v); setOutcome(null) }}>{t(`aicheck.verdict.${v}`)}</button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>{t('aicheck.reasonTitle')}</h3>
          <textarea className="t" value={reason} placeholder={t('aicheck.reasonPh')} aria-label={t('aicheck.reasonTitle')}
            onChange={e => { setReason(e.target.value); setOutcome(null) }} />
          <div className="spread" style={{ marginTop: 10 }}>
            <span className="small muted">{t('aicheck.words', { n: wordCount(reason), min: MIN_REASON_WORDS })}</span>
            <button className="btn primary" disabled={!verdict || !reason.trim()} onClick={check}>{t('aicheck.check')}</button>
          </div>
          {outcome && <Note kind={OUTCOME_KIND[outcome]}>{t(`aicheck.outcome.${outcome}`, { min: MIN_REASON_WORDS })}</Note>}
          {showExplanation && <Note><b>{t('aicheck.explanation')}</b> {pick(task.explanation, lang)}</Note>}
          {outcome === 'ok' && idx < tasks.length - 1 && (
            <button className="btn" onClick={() => goTo(idx + 1)}>{t('aicheck.next')} →</button>
          )}
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>{t('aicheck.footer')}</p>
    </LearnerShell>
  )
}
