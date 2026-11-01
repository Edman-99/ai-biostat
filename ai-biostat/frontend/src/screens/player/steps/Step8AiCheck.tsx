import { useTranslation } from 'react-i18next'
import { wordCount } from '@/core/text'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step8AiCheck() {
  const { t } = useTranslation()
  const { def, progress: c, patch, go } = useCaseSession()
  return (
    <>
      <h2>Шаг 8. Критическая проверка ИИ</h2>
      <p>Другой ИИ написал заключение по этим данным. Нажмите на фрагмент с ошибкой и объясните, как правильно. Репетитор на этом шаге недоступен.</p>
      <div className="aiq">
        {def.aiTrap.fragments.map((f, i) => (
          <span key={i}>
            <span className={`frag ${c.frag === i ? 'sel' : ''}`} tabIndex={0} role="button" aria-pressed={c.frag === i}
              onClick={() => patch({ frag: i })} onKeyDown={e => { if (e.key === 'Enter') patch({ frag: i }) }}>{f}</span>{' '}
          </span>
        ))}
      </div>
      <label className="f" htmlFor="fix">Что не так и как правильно</label>
      <textarea className="t" id="fix" style={{ minHeight: 90 }} value={c.fix} onChange={e => patch({ fix: e.target.value })} />
      <StepFooter canNext={c.frag != null && wordCount(c.fix) >= 5} why="Выберите фрагмент и напишите исправление (от 5 слов)"
        label={t('finish')} onNext={() => go(9)} />
    </>
  )
}
