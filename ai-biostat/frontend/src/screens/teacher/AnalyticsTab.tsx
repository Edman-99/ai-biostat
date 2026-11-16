import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { AnalyticsData } from '@/api/types'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { Note } from '@/ui/common'

const show = (v: number | null, unit = '%') => (v === null ? '—' : `${v}${unit}`)

/** Сводка по группе: только обобщённые показатели, без рейтинга студентов. */
export function AnalyticsTab() {
  const { t } = useTranslation()
  const { teacher, analytics } = useServices()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const [group, setGroup] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    setData(null)
    teacher.analytics()
      .then(d => { if (alive) { setData(d); setError('') } })
      .catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [teacher, version])

  const groups = useMemo(() => (data ? analytics.groups(data) : []), [data, analytics])
  const rep = useMemo(() => (data ? analytics.report(data, group || null) : null), [data, analytics, group])

  return (
    <>
      <div className="spread">
        <div>
          <p className="eyebrow">{t('analytics.eyebrow')}</p>
          <h1 className="serif">{t('analytics.title')}</h1>
          <p className="muted">{t('analytics.lead')}</p>
        </div>
        <div className="row">
          <select className="t" style={{ width: 'auto', minWidth: 180 }} value={group} onChange={e => setGroup(e.target.value)} aria-label={t('analytics.group')}>
            <option value="">{t('analytics.allGroups')}</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="btn" onClick={() => setVersion(v => v + 1)}>{t('common.refresh')}</button>
        </div>
      </div>
      {error && <Note kind="bad">{error}</Note>}
      {!rep && !error && <p className="muted">{t('common.loading')}</p>}
      {rep && (
        <>
          {groups.includes('ТЕСТ') && !group && <Note kind="warn">{t('analytics.testGroup')}</Note>}
          <div className="metric-row teacher-metrics">
            <article className="metric"><small>{t('analytics.participants')}</small><b>{rep.participants}</b>
              <p className="small muted">{t('analytics.active7', { n: rep.active7 })}</p></article>
            <article className="metric"><small>{t('analytics.avgScore')}</small><b>{show(rep.avgScore, '')}{rep.avgScore !== null && <span>{t('progress.of100')}</span>}</b>
              <p className="small muted">{t('analytics.avgScoreNote')}</p></article>
            <article className="metric"><small>{t('analytics.completed')}</small><b>{rep.completed}</b>
              <p className="small muted">{t('analytics.started', { n: rep.started })}</p></article>
            <article className="metric"><small>{t('analytics.trainer')}</small><b>{show(rep.trainerPct)}</b>
              <p className="small muted">{t('analytics.trainerUsers', { n: rep.trainerUsers })}</p></article>
          </div>

          <div className="teacher-grid">
            <div className="panel">
              <h2>{t('analytics.stepsTitle')}</h2>
              {rep.steps.length === 0 ? <p className="muted">{t('analytics.noCompleted')}</p> : (
                <div className="topic-list">
                  {rep.steps.map(s => (
                    <div key={s.key}><span>{t(`score.${s.key}`)}</span><i><b style={{ width: `${s.pct}%` }} /></i><strong>{s.pct}%</strong></div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel attention">
              <p className="eyebrow">{t('analytics.attentionEyebrow')}</p>
              <h2>{t('analytics.attentionTitle')}</h2>
              {rep.weakest.length === 0
                ? <p className="muted">{rep.steps.length ? t('analytics.noWeak') : t('analytics.noCompleted')}</p>
                : <ol>{rep.weakest.map((s, i) => (
                    <li key={s.key}><span>{String(i + 1).padStart(2, '0')}</span>
                      <p><b>{t(`score.${s.key}`)} — {s.pct}%</b>{t(`analytics.advice.${s.key}`)}</p></li>
                  ))}</ol>}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <h2>{t('analytics.compTitle')}</h2>
            <p className="small muted">{t('analytics.compLead', { n: rep.diagnosticsDone })}</p>
            <div className="dual-bars">
              {rep.competencies.map(c => (
                <div key={c.block}>
                  <span>{t(`blocks.${BLOCK_KEY[c.block]}`)}</span>
                  <i><b style={{ width: `${c.entry ?? 0}%` }} /><em style={{ width: `${c.cases ?? 0}%` }} /></i>
                  <strong>{show(c.entry)} → {show(c.cases)}</strong>
                </div>
              ))}
            </div>
            <div className="legend"><span><i className="l-entry" />{t('progress.legendEntry')}</span><span><i className="l-now" />{t('progress.legendCases')}</span></div>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>{t('analytics.footer')}</p>
        </>
      )}
    </>
  )
}
