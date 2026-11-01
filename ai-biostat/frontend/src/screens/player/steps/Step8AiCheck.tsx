import { useTranslation } from 'react-i18next'
import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step8AiCheck() {
  const { t } = useTranslation()
  const { def, progress: c, patch, go } = useCaseSession()
  return (
    <>
      <h2>{t('step8.title')}</h2>
      <p>{t('step8.intro')}</p>
      <div className="aiq">
        {def.aiTrap.fragments.map((f, i) => (
          <span key={i}>
            <span className={`frag ${c.frag === i ? 'sel' : ''}`} tabIndex={0} role="button" aria-pressed={c.frag === i}
              onClick={() => patch({ frag: i })} onKeyDown={e => { if (e.key === 'Enter') patch({ frag: i }) }}>{f}</span>{' '}
          </span>
        ))}
      </div>
      <label className="f" htmlFor="fix">{t('step8.label')}</label>
      <textarea className="t" id="fix" style={{ minHeight: 90 }} value={c.fix} onChange={e => patch({ fix: e.target.value })} />
      <StepFooter canNext={c.frag != null && wordCount(c.fix) >= 5} why={t('step8.why')}
        label={t('step8.finish')} onNext={() => go(9)} />
    </>
  )
}
