import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { BLOCKS, competenciesFromCases } from '@/domain/progress/Competencies'
import type { ScoreSheet } from '@/domain/scoring/CaseScorer'
import { PageHead } from '@/ui/AppShell'
import { Note } from '@/ui/common'
import { LearnerShell } from './LearnerShell'
import { useCaseResults } from './useCaseResults'

function Metric({ label, value, unit, pct, note }: { label: string; value: string; unit?: string; pct: number | null; note?: string }) {
  return (
    <article className="metric">
      <small>{label}</small>
      <b>{value}{unit && <span>{unit}</span>}</b>
      {note && <p className="small muted" style={{ margin: '4px 0 0' }}>{note}</p>}
      <i style={{ '--p': `${pct ?? 0}%` } as React.CSSProperties} />
    </article>
  )
}

export function ProgressScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const { app, aiCheck } = useServices()
  const { diag, exit, trainer } = useAppState()
  const exitDone = exit.done && !!exit.pct
  const results = useCaseResults()
  const available = results.filter(r => r.status !== 'empty')
  const done = results.filter(r => r.status === 'done')
  const sheets = done.map(r => r.sheet).filter((s): s is ScoreSheet => !!s)
  const avgScore = sheets.length ? Math.round(sheets.reduce((a, s) => a + s.total, 0) / sheets.length) : null
  const trainerPct = aiCheck.successPct(trainer)
  const fromCases = competenciesFromCases(sheets)

  return (
    <LearnerShell>
      <PageHead eyebrow={t('progress.eyebrow')} title={t('progress.title')} lead={t('progress.lead')} />

      <div className="metric-row">
        <Metric label={t('progress.casesDone')} value={String(done.length)} unit={`/${results.length}`}
          pct={results.length ? done.length / results.length * 100 : 0}
          note={available.length < results.length ? t('progress.casesAvailable', { n: available.length }) : undefined} />
        <Metric label={t('progress.avgScore')} value={avgScore === null ? '—' : String(avgScore)} unit={avgScore === null ? '' : t('progress.of100')}
          pct={avgScore} note={t('progress.preliminary')} />
        <Metric label={t('progress.aiCheck')} value={trainerPct === null ? '—' : String(trainerPct)} unit={trainerPct === null ? '' : '%'}
          pct={trainerPct} note={trainerPct === null ? t('progress.aiCheckNone') : undefined} />
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>{t('progress.dynamicsTitle')}</h2>
        <p className="small muted">{t('progress.dynamicsLead')}</p>
        <div className="dual-bars">
          {BLOCKS.map(b => {
            const entry = diag.pct?.[b] ?? null
            const now = exitDone ? exit.pct![b] ?? null : fromCases?.[b] ?? null
            return (
              <div key={b}>
                <span>{t(`blocks.${BLOCK_KEY[b]}`)}</span>
                <i><b style={{ width: `${entry ?? 0}%` }} /><em style={{ width: `${now ?? 0}%` }} /></i>
                <strong>{entry === null ? '—' : `${entry}%`} → {now === null ? '—' : `${now}%`}</strong>
              </div>
            )
          })}
        </div>
        <div className="legend"><span><i className="l-entry" />{t('progress.legendEntry')}</span><span><i className="l-now" />{t(exitDone ? 'progress.legendExit' : 'progress.legendCases')}</span></div>
        {!fromCases && !exitDone && <Note>{t('progress.noCasesYet')}</Note>}
      </div>

      <h2 style={{ marginTop: 26 }}>{t('progress.casesTitle')}</h2>
      <div className="cases">
        {results.map(r => (
          <button key={r.entry.id} className={`case ${r.status === 'empty' ? 'locked' : ''}`} aria-disabled={r.status === 'empty' || undefined}
            onClick={() => r.status !== 'empty' && app.openCase(r.entry.id)}>
            <span className="n">{r.entry.id}</span>
            <span><b>{pick(r.entry.title, lang)}</b><br />
              <span className="small muted">{
                r.status === 'done' && r.sheet && r.grade ? t('progress.caseDone', { score: r.sheet.total, grade: r.grade.letter })
                  : r.status === 'progress' ? t('casesPage.status.progress', { n: r.progress?.step ?? 1 })
                    : r.status === 'new' ? t('casesPage.status.new') : t('home.notFilled')}</span></span>
            <span className="tag">{t(`home.level.${r.entry.level}`)}</span>
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>{t('progress.footer')}</p>
    </LearnerShell>
  )
}
