import { useTranslation } from 'react-i18next'
import { toRegExp } from '@/domain/cases/CaseDefinition'
import { minInterpretationWords } from '@/domain/scoring/StepScorers'
import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step7Interpretation() {
  const { t } = useTranslation()
  const { def, progress: c, level, patch, go } = useCaseSession()
  const min = minInterpretationWords(level)
  const n = wordCount(c.interp)

  return (
    <>
      <h2>{t('step7.title')}</h2>
      <p>{t('step7.intro')}</p>
      <div className="out" style={{ margin: '0 0 12px' }}>{def.code.outputs[c.lang].split('\n').slice(0, 4).join('\n')}</div>
      <label className="f" htmlFor="interp">{t('step7.label')}</label>
      <textarea className="t" id="interp" style={{ minHeight: 160 }} value={c.interp} onChange={e => patch({ interp: e.target.value })} />
      <div className="spread small"><span className="muted">{t('step7.structure')}</span><span>{t('step7.words', { n, min })}</span></div>
      <ul className="check">
        {def.interpretation.checklist.map(item => (
          <li key={item.label} className={toRegExp(item.pattern).test(c.interp) ? 'yes' : ''}>{item.label}</li>
        ))}
      </ul>
      <StepFooter canNext={n >= min} why={t('step7.why', { min })} label={t('step7.submit')} onNext={() => go(8)} />
    </>
  )
}
