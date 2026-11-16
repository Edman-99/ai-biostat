import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { fullName } from '@/core/text'
import type { DebriefItem } from '@/domain/scoring/DebriefBuilder'
import { useCaseSession } from './CaseSession'
import { useStepNames } from './steps'

/**
 * Отчёт по кейсу для печати / «Сохранить как PDF» (окно печати браузера). На экране скрыт, при печати —
 * только он (styles/sections.css, @media print). Казахские буквы печатаются шрифтами страницы.
 */
export function CaseReport() {
  const { t } = useTranslation()
  const { scorer, grades, debrief } = useServices()
  const { me } = useAppState()
  const { def, progress: c, level } = useCaseSession()
  const stepNames = useStepNames()
  const sheet = useMemo(() => scorer.score(def, c, level), [scorer, def, c, level])
  const fb = useMemo(() => debrief.build(def, c, sheet), [debrief, def, c, sheet])
  const g = grades.gradeOf(sheet.total)
  const label = (i: DebriefItem) => ('key' in i ? t(`debrief.${i.key}`) : i.text)
  const name = fullName(me)
  const list = (items: DebriefItem[]) => (items.length ? <ul>{items.map(i => <li key={label(i)}>{label(i)}</li>)}</ul> : <p>—</p>)
  const answer = (text: string) => <p className="r-answer">{text.trim() || '—'}</p>

  // вне #app: на время печати весь сайт скрыт (html.printing-report), печатается только отчёт
  return createPortal(
    <div className="report-print" aria-hidden="true">
      <header className="r-head">
        <div><b>AI-Biostat</b> · {t('report.title')}</div>
        <div>{new Date().toLocaleDateString()}</div>
      </header>
      <h1>{t('home.caseTitle', { id: def.id, title: def.title })}</h1>
      <p className="r-meta">
        {t('report.participant')}: <b>{me?.code}</b>{name ? ` (${name})` : ''}
        {me?.group ? ` · ${t('common.group', { group: me.group })}` : ''}
        {` · ${t(level === 'post' ? 'common.specialist' : 'common.student')}`}
      </p>

      <div className="r-score">
        <div className="r-total">{sheet.total} <span>/ 100</span></div>
        <div><b>{g.letter}</b> — {t(`grade.${g.labelKey}`)}<br />
          <span className="r-muted">{c.disputed ? t('step9.disputed') : t('step9.prelim')}</span></div>
      </div>

      <h2>{t('step9.byStep')}</h2>
      <table className="r-table"><tbody>
        {sheet.steps.map(s => <tr key={s.key}><td>{t(`score.${s.key}`)}</td><td>{s.value} / {s.max}</td></tr>)}
      </tbody></table>

      <div className="r-cols">
        <div><h3>{t('step9.good')}</h3>{list(fb.good)}</div>
        <div><h3>{t('step9.bad')}</h3>{list(fb.bad)}</div>
        <div><h3>{t('step9.repeat')}</h3>{list(fb.repeat)}</div>
      </div>

      <h2>{t('report.answers')}</h2>
      <h3>{t('report.stepN', { n: 4, name: stepNames[3] })}</h3>{answer(c.question)}
      <h3>{t('report.stepN', { n: 5, name: stepNames[4] })}</h3>
      {answer(c.m.choice != null ? `${def.method.options[c.m.choice]}${c.m.ok ? '' : ` — ${t('report.methodNotOk')}`}` : '')}
      <h3>{t('report.stepN', { n: 6, name: stepNames[5] })} · {c.lang}</h3>
      <pre className="r-code">{c.out || (c.ran ? def.code.outputs[c.lang] : '—')}</pre>
      <h3>{t('report.stepN', { n: 7, name: stepNames[6] })}</h3>{answer(c.interp)}
      <h3>{t('report.stepN', { n: 8, name: stepNames[7] })}</h3>
      {answer(c.frag != null ? `«${def.aiTrap.fragments[c.frag]}» — ${c.fix}` : '')}

      <h2>{t('report.reference')}</h2>
      <p>{def.debrief.referenceConclusion}</p>
      <p className="r-muted r-foot">{t('report.footer')}</p>
    </div>,
    document.body,
  )
}

/** Печать отчёта (в окне печати — «Сохранить как PDF»). */
export function printCaseReport() {
  const root = document.documentElement
  root.classList.add('printing-report')
  const done = () => { root.classList.remove('printing-report'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
}
