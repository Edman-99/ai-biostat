import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { Note } from '@/ui/common'
import { useCaseSession } from '../CaseSession'

export function Step10Finish() {
  const { t } = useTranslation()
  const { app, scorer, grades } = useServices()
  const { def, progress: c, level } = useCaseSession()
  const total = scorer.score(def, c, level).total
  const g = grades.gradeOf(total)
  const other = c.lang === 'R' ? 'Python' : 'R'
  const code = def.code.templates[other].join('\n').replace(/\[(\d)\]/g, (_, i) => def.code.blankAnswers[Number(i)])
  const next = total >= 85 ? t('step10.nextHarder') : total >= 70 ? t('step10.next') : t('step10.retry')

  return (
    <>
      <h2>{t('step10.title')}</h2>
      <p><b>{t('step10.result', { total, letter: g.letter, label: t(`grade.${g.labelKey}`) })}</b>{t('step10.resultNote')}</p>
      <Note>{t('step10.otherCode', { lang: other })}</Note>
      <div className="editor">{code}</div>
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn primary" onClick={() => app.navigate('home')}>{next}</button>
        <button className="btn">{t('step10.pdf')}</button>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>{t('step10.note')}</p>
    </>
  )
}
