import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { PageHead } from '@/ui/AppShell'
import { ProgressBar } from '@/ui/common'
import { LearnerShell } from './LearnerShell'
import { useCaseResults, type CaseResult } from './useCaseResults'

function CaseCard({ r, featured }: { r: CaseResult; featured: boolean }) {
  const { t } = useTranslation()
  const lang = useLang()
  const { app } = useServices()
  const open = r.status !== 'empty'
  const status = {
    empty: t('casesPage.status.empty'),
    new: featured ? t('casesPage.status.recommended') : t('casesPage.status.new'),
    progress: t('casesPage.status.progress', { n: r.progress?.step ?? 1 }),
    done: t('casesPage.status.done'),
  }[r.status]

  return (
    <article className={`case-card ${featured ? 'featured' : ''} ${open ? '' : 'locked'}`}>
      <div className="case-top"><span>{status}</span><b>{r.entry.id.padStart(2, '0')}</b></div>
      <p className="case-tag">{pick(r.entry.methods, lang)} · {t(`home.level.${r.entry.level}`)}</p>
      <h2>{pick(r.entry.title, lang)}</h2>
      {r.status === 'progress' && r.progress && <ProgressBar pct={(r.progress.maxStep - 1) / 10 * 100} style={{ margin: '4px 0 10px' }} />}
      {r.status === 'done' && r.sheet && r.grade && (
        <p className="case-score"><b>{r.sheet.total}</b> {t('step9.outOf')} · {r.grade.letter} · <span className="muted">{t('casesPage.preliminary')}</span></p>
      )}
      <div className="case-meta"><span>{t('casesPage.steps')}</span><span>{t('casesPage.time')}</span></div>
      {open
        ? <button className={`btn ${featured ? 'primary' : ''}`} onClick={() => app.openCase(r.entry.id)}>
            {r.status === 'new' ? t('home.startCase') : r.status === 'done' ? t('casesPage.review') : t('common.cont')} →
          </button>
        : <span className="small muted">{t('home.notFilled')}</span>}
    </article>
  )
}

export function CasesScreen() {
  const { t } = useTranslation()
  const results = useCaseResults()
  const featured = (results.find(r => r.status === 'progress') ?? results.find(r => r.status === 'new'))?.entry.id

  return (
    <LearnerShell>
      <PageHead eyebrow={t('casesPage.eyebrow')} title={t('casesPage.title')} lead={t('casesPage.lead')} />
      <div className="case-grid">
        {results.map(r => <CaseCard key={r.entry.id} r={r} featured={r.entry.id === featured} />)}
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>{t('home.footer')}</p>
    </LearnerShell>
  )
}
