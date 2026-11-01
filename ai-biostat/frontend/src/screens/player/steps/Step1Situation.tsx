import { useTranslation } from 'react-i18next'
import { Note, RichText } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step1Situation() {
  const { t } = useTranslation()
  const { def, go } = useCaseSession()
  return (
    <>
      <h2>{t('step1.title')}</h2>
      {def.situation.paragraphs.map((p, i) => <p key={i}><RichText text={p} /></p>)}
      <Note>{def.situation.goal}</Note>
      <StepFooter canNext label={t('step1.toData')} onNext={() => go(2)} />
    </>
  )
}
