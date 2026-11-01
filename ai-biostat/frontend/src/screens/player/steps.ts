import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Step1Situation } from './steps/Step1Situation'
import { Step2Data } from './steps/Step2Data'
import { Step3Types } from './steps/Step3Types'
import { Step4Question } from './steps/Step4Question'
import { Step5Method } from './steps/Step5Method'
import { Step6Code } from './steps/Step6Code'
import { Step7Interpretation } from './steps/Step7Interpretation'
import { Step8AiCheck } from './steps/Step8AiCheck'
import { Step9Debrief } from './steps/Step9Debrief'
import { Step10Finish } from './steps/Step10Finish'

export function useStepNames(): string[] {
  const { t } = useTranslation()
  return t('player.steps', { returnObjects: true }) as string[]
}

export const STEP_COMPONENTS: ComponentType[] = [
  Step1Situation, Step2Data, Step3Types, Step4Question, Step5Method, Step6Code,
  Step7Interpretation, Step8AiCheck, Step9Debrief, Step10Finish,
]
