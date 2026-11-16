import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { SurveyGroupStatus } from '@/api/SurveyApi'
import { TEACHER_SURVEY } from '@/domain/survey/Survey'
import { Note } from '@/ui/common'
import { SurveyForm } from '@/ui/SurveyForm'

/** Опросник: управление группами (открыть/закрыть, ответили, средний SUS), выгрузка и своя анкета преподавателя. */
export function SurveyTab() {
  const { t } = useTranslation()
  const { survey } = useServices()
  const [groups, setGroups] = useState<SurveyGroupStatus[] | null>(null)
  const [mineDone, setMineDone] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    survey.status().then(r => { setGroups(r.groups); setMineDone(r.mine_done); setError('') }).catch(e => setError((e as Error).message))
  }, [survey])
  useEffect(load, [load])

  const toggle = async (g: SurveyGroupStatus) => {
    setBusy(g.grp)
    try { await survey.setOpen(g.grp, !g.open); load() } catch (e) { setError((e as Error).message) } finally { setBusy('') }
  }

  if (showForm) {
    return (
      <>
        <button className="btn ghost" onClick={() => setShowForm(false)}>← {t('teacher.surveyTab.back')}</button>
        <h1 className="serif">{t('teacher.surveyTab.myTitle')}</h1>
        <p className="muted">{t('teacher.surveyTab.myLead')}</p>
        <SurveyForm sections={TEACHER_SURVEY} onDone={() => { setShowForm(false); load() }} />
      </>
    )
  }

  return (
    <>
      <div className="spread">
        <div><p className="eyebrow">{t('teacher.surveyTab.eyebrow')}</p><h1 className="serif">{t('teacher.tabs.survey')}</h1></div>
        <div className="row">
          <a className="btn" href={survey.exportUrl()}>{t('teacher.surveyTab.export')} · CSV</a>
          <button className="btn" onClick={load}>{t('common.refresh')}</button>
        </div>
      </div>
      <p className="muted">{t('teacher.surveyTab.intro')}</p>
      {error && <Note kind="bad">{error}</Note>}
      <div className="cont" style={{ margin: '12px 0 18px' }}>
        <div><b>{t('teacher.surveyTab.myTitle')}</b><p className="small muted" style={{ margin: 0 }}>{mineDone ? t('teacher.surveyTab.myDone') : t('teacher.surveyTab.myLead')}</p></div>
        <button className={`btn ${mineDone ? '' : 'primary'}`} onClick={() => setShowForm(true)}>{mineDone ? t('teacher.surveyTab.myAgain') : t('teacher.surveyTab.myStart')}</button>
      </div>
      {!groups ? <p className="muted">{t('common.loading')}</p> : !groups.length ? <p className="muted">{t('teacher.diagTab.empty')}</p> : (
        <div className="tbl"><table>
          <thead><tr><th>{t('teacher.diagTab.group')}</th><th>{t('teacher.surveyTab.answered')}</th><th>{t('teacher.surveyTab.sus')}</th><th>{t('teacher.diagTab.status')}</th><th /></tr></thead>
          <tbody>{groups.map(g => (
            <tr key={g.grp}>
              <td><b>{g.grp}</b></td>
              <td className="num">{g.done} / {g.people}</td>
              <td className="num">{g.sus_avg ?? '—'}</td>
              <td>{g.open ? <span className="tag" style={{ color: 'var(--ok)' }}>{t('teacher.diagTab.open')}</span> : <span className="tag">{t('teacher.diagTab.closed')}</span>}</td>
              <td><button className={`btn small ${g.open ? '' : 'primary'}`} disabled={busy === g.grp} onClick={() => toggle(g)}>
                {g.open ? t('teacher.diagTab.closeBtn') : t('teacher.surveyTab.openBtn')}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="small muted" style={{ marginTop: 12 }}>{t('teacher.surveyTab.note')}</p>
    </>
  )
}
