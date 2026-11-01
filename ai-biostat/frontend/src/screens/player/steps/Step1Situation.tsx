import { Note, RichText } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step1Situation() {
  const { def, go } = useCaseSession()
  return (
    <>
      <h2>Шаг 1. Профессиональная ситуация</h2>
      {def.situation.paragraphs.map((p, i) => <p key={i}><RichText text={p} /></p>)}
      <Note>{def.situation.goal}</Note>
      <StepFooter canNext label="К данным" onNext={() => go(2)} />
    </>
  )
}
