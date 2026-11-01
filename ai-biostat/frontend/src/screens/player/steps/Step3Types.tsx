import { useTranslation } from 'react-i18next'
import { Fragment } from 'react'
import type { VarType } from '@/domain/cases/CaseDefinition'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

const TYPES: VarType[] = ['q', 'n', 'o', 'b', 'id']

export function Step3Types() {
  const { t } = useTranslation()
  const { def, progress: c, level, patch, go } = useCaseSession()
  const ro = c.locked
  const vars = def.variables
  const done = vars.filter(v => c.types[v.key]).length

  return (
    <>
      <h2>{t('step3.title')}</h2>
      <p>{t('step3.intro')}</p>
      <div className="types">
        <span className="h">{t('step3.variable')}</span><span className="h">{t('step3.type')}</span><span className="h">{t('step3.outcome')}</span>
        {vars.map(v => (
          <Fragment key={v.key}>
            <span><code>{v.key}</code> <span className="muted small">{v.label}</span></span>
            <select className="t" disabled={ro} aria-label={t('step3.typeAria', { label: v.label })} value={c.types[v.key] || ''}
              onChange={e => patch({ types: { ...c.types, [v.key]: e.target.value } })}>
              <option value="">{t('step3.choose')}</option>
              {TYPES.map(k => <option key={k} value={k}>{t(`step3.types.${k}`)}</option>)}
              {level === 'post' && <option value="other">{t('step3.other')}</option>}
            </select>
            <label className="row small">
              <input type="radio" name="out" value={v.key} checked={c.outcome === v.key} disabled={ro}
                onChange={() => patch({ outcome: v.key })} /> {t('step3.outcomeRadio')}
            </label>
          </Fragment>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>{t('step3.done', { done, total: vars.length })}</p>
      <StepFooter canNext={done === vars.length && !!c.outcome}
        why={t('step3.why', { n: vars.length })} onNext={() => go(4)} />
    </>
  )
}
