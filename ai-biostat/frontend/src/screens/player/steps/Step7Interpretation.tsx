import { toRegExp } from '@/domain/cases/CaseDefinition'
import { minInterpretationWords } from '@/domain/scoring/StepScorers'
import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step7Interpretation() {
  const { def, progress: c, level, patch, go } = useCaseSession()
  const min = minInterpretationWords(level)
  const n = wordCount(c.interp)

  return (
    <>
      <h2>Шаг 7. Интерпретация</h2>
      <p>Сформулируйте вывод своими словами. Репетитор на этом шаге не пишет вывод за вас.</p>
      <div className="out" style={{ margin: '0 0 12px' }}>{def.code.outputs[c.lang].split('\n').slice(0, 4).join('\n')}</div>
      <label className="f" htmlFor="interp">Ваш вывод</label>
      <textarea className="t" id="interp" style={{ minHeight: 160 }} value={c.interp} onChange={e => patch({ interp: e.target.value })} />
      <div className="spread small"><span className="muted">Структура вывода (без готовых формулировок):</span><span>{n} / {min} слов</span></div>
      <ul className="check">
        {def.interpretation.checklist.map(item => (
          <li key={item.label} className={toRegExp(item.pattern).test(c.interp) ? 'yes' : ''}>{item.label}</li>
        ))}
      </ul>
      <StepFooter canNext={n >= min} why={`Нужно не меньше ${min} слов`} label="Отправить вывод" onNext={() => go(8)} />
    </>
  )
}
