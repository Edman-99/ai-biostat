import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { missingKeys, type SurveyAnswers, type SurveySection } from '@/domain/survey/Survey'
import { Note } from './common'

function Scale({ name, value, onChange, from = 1, labels }: {
  name: string; value: number | undefined; onChange: (v: number) => void; from?: number; labels?: [string, string]
}) {
  const { t } = useTranslation()
  const values = Array.from({ length: 6 - from }, (_, i) => from + i)
  return (
    <div className="scale-row">
      {labels && <span className="small muted">{labels[0]}</span>}
      <div className="seg" role="radiogroup" aria-label={name}>
        {values.map(v => (
          <button key={v} type="button" role="radio" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(v)}>
            {v === 0 ? t('survey.na') : v}
          </button>
        ))}
      </div>
      {labels && <span className="small muted">{labels[1]}</span>}
    </div>
  )
}

/** Анкета: разделы SUS / части курса / «до и сейчас» / открытые вопросы. Обязательные — все, кроме открытых. */
export function SurveyForm({ sections, onDone }: { sections: SurveySection[]; onDone: () => void }) {
  const { t } = useTranslation()
  const lang = useLang()
  const { survey } = useServices()
  const [a, setA] = useState<SurveyAnswers>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tried, setTried] = useState(false)
  const set = (k: string, v: number | string) => setA(x => ({ ...x, [k]: v }))
  const missing = missingKeys(sections, a)
  const isMissing = (k: string) => tried && missing.includes(k)

  const submit = async () => {
    setTried(true)
    if (missing.length) { setError(t('survey.fillAll', { n: missing.length })); return }
    setBusy(true); setError('')
    try {
      const clean = Object.fromEntries(Object.entries(a).filter(([, v]) => typeof v === 'number' || String(v).trim()))
      await survey.submit(clean); onDone()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  let n = 0
  return (
    <div className="survey">
      {sections.map(sec => (
        <section key={sec.id} className="panel survey-sec">
          <h3>{t(`survey.section.${sec.id}`)}</h3>
          <p className="small muted">{t(`survey.hint.${sec.id}`)}</p>
          {sec.items.map(it => {
            n += 1
            const label = <p className="survey-q"><b>{n}.</b> {pick(it.text, lang)}</p>
            if (it.kind === 'open') {
              return <div key={it.id} className="survey-item">{label}
                <textarea className="t" maxLength={2000} value={(a[it.id] as string) ?? ''} onChange={e => set(it.id, e.target.value)} /></div>
            }
            if (it.kind === 'prepost') {
              return <div key={it.id} className={`survey-item ${isMissing(`${it.id}_before`) || isMissing(`${it.id}_now`) ? 'missing' : ''}`}>{label}
                <div className="prepost">
                  <span className="small">{t('survey.before')}</span>
                  <Scale name={`${it.id}_before`} value={a[`${it.id}_before`] as number} onChange={v => set(`${it.id}_before`, v)} />
                  <span className="small">{t('survey.now')}</span>
                  <Scale name={`${it.id}_now`} value={a[`${it.id}_now`] as number} onChange={v => set(`${it.id}_now`, v)} />
                </div></div>
            }
            if (it.kind === 'yesno') {
              return <div key={it.id} className={`survey-item ${isMissing(it.id) ? 'missing' : ''}`}>{label}
                <div className="seg" role="radiogroup" aria-label={it.id}>
                  {[[1, t('survey.yes')], [0, t('survey.no')]].map(([v, txt]) => (
                    <button key={v} type="button" role="radio" aria-checked={a[it.id] === v} aria-pressed={a[it.id] === v}
                      onClick={() => set(it.id, v as number)} style={{ minWidth: 72 }}>{txt}</button>
                  ))}
                </div></div>
            }
            return <div key={it.id} className={`survey-item ${isMissing(it.id) ? 'missing' : ''}`}>{label}
              <Scale name={it.id} value={a[it.id] as number} onChange={v => set(it.id, v)} from={it.kind === 'part' ? 0 : 1}
                labels={it.kind === 'scale' ? [t('survey.disagree'), t('survey.agree')]
                  : it.kind === 'points' ? [t('survey.min'), t('survey.max')] : [t('survey.poor'), t('survey.excellent')]} /></div>
          })}
        </section>
      ))}
      {error && <Note kind="bad">{error}</Note>}
      <button className="btn primary big" disabled={busy} onClick={submit}>{busy ? t('common.saving') : t('survey.submit')}</button>
      <p className="small muted" style={{ marginTop: 10 }}>{t('survey.privacy')}</p>
    </div>
  )
}
