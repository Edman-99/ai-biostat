import { useTranslation } from 'react-i18next'
import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step4Question() {
  const { t } = useTranslation()
  const { progress: c, patch, go } = useCaseSession()
  return (
    <>
      <h2>{t('step4.title')}</h2>
      <p>{t('step4.intro')}</p>
      <label className="f" htmlFor="q">{t('step4.label')}</label>
      <textarea className="t" id="q" readOnly={c.locked} placeholder={t('step4.placeholder')}
        value={c.question} onChange={e => patch({ question: e.target.value })} />
      <StepFooter canNext={wordCount(c.question) >= 6} why={t('step4.why')}
        label={t('step4.submit')} onNext={() => go(5)} />
    </>
  )
}
