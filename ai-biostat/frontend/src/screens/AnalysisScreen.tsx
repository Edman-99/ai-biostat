import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { generateCase21Rows } from '@/cases/case21/data'
import { useLang } from '@/core/i18n'
import { codeFor } from '@/domain/analysis/CodeTemplates'
import { parseCsv, type Dataset } from '@/domain/analysis/Dataset'
import { describe, isNumericColumn, type Summary } from '@/domain/analysis/Descriptives'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { LearnerShell } from './LearnerShell'

const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Учебный набор — данные кейса 21 (с теми же ошибками ввода, что на шаге 2: их видно по min/max). */
function learningDataset(): Dataset {
  const rows = generateCase21Rows().map(r => ({
    id: String(r.id), age: String(r.age), sex: r.sex, employment: r.emp, viral_load: String(r.vl), vl_suppressed: r.sup,
  }))
  return { name: 'case21_hiv_employment.csv', delimiter: ',', columns: Object.keys(rows[0]), rows }
}

type Tab = 'results' | 'python' | 'r'

function useNumberFormat() {
  const lang = useLang()
  return useMemo(() => {
    const nf = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 2 })
    return (x: number) => (Number.isFinite(x) ? nf.format(x) : '—')
  }, [lang])
}

function SummaryView({ s, column }: { s: Summary; column: string }) {
  const { t } = useTranslation()
  const f = useNumberFormat()
  if (s.kind === 'numeric') {
    const cells: [string, string][] = [
      ['n', String(s.n)], [t('analysis.stat.missing'), String(s.missing)],
      [t('analysis.stat.mean'), f(s.mean)], [t('analysis.stat.sd'), f(s.sd)],
      [t('analysis.stat.median'), f(s.median)], [t('analysis.stat.iqr'), `${f(s.q1)} – ${f(s.q3)}`],
      [t('analysis.stat.min'), f(s.min)], [t('analysis.stat.max'), f(s.max)],
    ]
    return (
      <>
        <p className="eyebrow">{t('analysis.numericTitle', { col: column })}</p>
        <div className="stat-cards">{cells.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
        <p className="small muted" style={{ marginTop: 16 }}>{t('analysis.numericHint')}</p>
      </>
    )
  }
  return (
    <>
      <p className="eyebrow">{t('analysis.categoricalTitle', { col: column })}</p>
      <div className="tbl">
        <table>
          <thead><tr><th>{t('analysis.value')}</th><th>n</th><th>%</th></tr></thead>
          <tbody>
            {s.levels.slice(0, 30).map(l => <tr key={l.value}><td>{l.value}</td><td className="num">{l.n}</td><td className="num">{f(l.pct)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        {t('analysis.catFooter', { n: s.n, missing: s.missing })}{s.levels.length > 30 ? ` ${t('analysis.moreLevels', { n: s.levels.length })}` : ''}
      </p>
      <p className="small muted">{t('analysis.categoricalHint')}</p>
    </>
  )
}

export function AnalysisScreen() {
  const { t } = useTranslation()
  const { research } = useServices()
  const [ds, setDs] = useState<Dataset | null>(null)
  const [error, setError] = useState('')
  const [column, setColumn] = useState('')
  const [asCategory, setAsCategory] = useState(false)
  const [result, setResult] = useState<{ column: string; summary: Summary } | null>(null)
  const [tab, setTab] = useState<Tab>('results')

  const load = (d: Dataset) => {
    setDs(d); setError(''); setResult(null); setAsCategory(false)
    setColumn(d.columns.find(c => isNumericColumn(d.rows.map(r => r[c]))) ?? d.columns[0])
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) { setError(t('analysis.tooBig')); return }
    const reader = new FileReader()
    reader.onload = () => {
      try { load(parseCsv(String(reader.result), file.name)) } catch { setDs(null); setError(t('analysis.readError')) }
    }
    reader.readAsText(file)
  }

  const numeric = useMemo(() => (ds && column ? isNumericColumn(ds.rows.map(r => r[column])) : false), [ds, column])

  const run = () => {
    if (!ds) return
    const summary = describe(ds, column, asCategory)
    setResult({ column, summary }); setTab('results')
    research.trackSection('analysis_run', { kind: summary.kind, learning: ds.name === 'case21_hiv_employment.csv' })
  }

  const code = ds && result ? codeFor(ds, result.column, result.summary) : null

  return (
    <LearnerShell>
      <PageHead eyebrow={t('analysis.eyebrow')} title={t('analysis.title')} lead={t('analysis.lead')}
        aside={<span className="pill">{t('analysis.mode')}</span>} />
      <div className="analysis-grid">
        <div className="panel">
          <h3>{t('analysis.step1')}</h3>
          <Note kind="warn" style={{ marginTop: 0 }}>{t('analysis.privacy')}</Note>
          <label className="upload-box">
            <input type="file" accept=".csv,text/csv,.txt" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            <span>{t('analysis.upload')}</span>
            <small>{t('analysis.uploadHint')}</small>
          </label>
          <button className="btn" style={{ width: '100%' }} onClick={() => load(learningDataset())}>{t('analysis.useLearning')}</button>
          <div className="dataset-status">
            {error ? <span style={{ color: 'var(--bad)' }}>{error}</span>
              : ds ? t('analysis.loaded', { name: ds.name, rows: ds.rows.length, cols: ds.columns.length })
                : t('analysis.noData')}
          </div>

          <h3 style={{ marginTop: 20 }}>{t('analysis.step2')}</h3>
          <select className="t" disabled={!ds} value={column} aria-label={t('analysis.step2')}
            onChange={e => { setColumn(e.target.value); setAsCategory(false) }}>
            {ds ? ds.columns.map(c => <option key={c} value={c}>{c}</option>) : <option>{t('analysis.noData')}</option>}
          </select>
          {ds && (
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              {numeric ? t('analysis.detectedNumeric') : t('analysis.detectedCategorical')}
              {numeric && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <input type="checkbox" checked={asCategory} onChange={e => setAsCategory(e.target.checked)} /> {t('analysis.asCategory')}
                </label>
              )}
            </p>
          )}
          <button className="btn primary" style={{ width: '100%', marginTop: 16 }} disabled={!ds} onClick={run}>{t('analysis.run')} →</button>
        </div>

        <div className="panel analysis-out">
          <div className="seg" role="tablist">
            {(['results', 'python', 'r'] as Tab[]).map(k => (
              <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{t(`analysis.tab.${k}`)}</button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            {!result && <div className="empty-state">{t('analysis.empty')}</div>}
            {result && tab === 'results' && <SummaryView s={result.summary} column={result.column} />}
            {result && code && tab !== 'results' && (
              <>
                <pre className="out" style={{ marginTop: 0 }}>{tab === 'python' ? code.python : code.r}</pre>
                <p className="small muted">{t('analysis.codeHint')}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flow-strip">
        <p className="eyebrow">{t('analysis.flowTitle')}</p>
        <div>{(t('analysis.flow', { returnObjects: true }) as string[]).map((s, i) => (
          <span key={s} className="flow-item">{i > 0 && <b aria-hidden="true">→</b>}<span>{s}</span></span>
        ))}</div>
      </div>
    </LearnerShell>
  )
}
