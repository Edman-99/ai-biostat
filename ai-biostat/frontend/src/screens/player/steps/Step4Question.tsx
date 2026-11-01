import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step4Question() {
  const { progress: c, patch, go } = useCaseSession()
  return (
    <>
      <h2>Шаг 4. Исследовательский вопрос</h2>
      <p>Сформулируйте своими словами исследовательский вопрос и гипотезу. Репетитор на этом шаге недоступен.</p>
      <label className="f" htmlFor="q">Вопрос и гипотеза</label>
      <textarea className="t" id="q" readOnly={c.locked} placeholder="Например: связана ли … с …? Гипотеза: …"
        value={c.question} onChange={e => patch({ question: e.target.value })} />
      <StepFooter canNext={wordCount(c.question) >= 6} why="Напишите хотя бы одно предложение (от 6 слов)"
        label="Сохранить ответ" onNext={() => go(5)} />
    </>
  )
}
