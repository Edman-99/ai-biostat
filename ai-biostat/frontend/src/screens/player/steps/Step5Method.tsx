import { useTranslation } from 'react-i18next'
import { wordCount } from '@/core/text'
import { Note, OptionList } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

/** Выбор метода: 2 попытки (вторая −5). После перехода дальше шаги 1–4 закрываются для правки. */
export function Step5Method() {
  const { t } = useTranslation()
  const { def, progress: c, patch, go } = useCaseSession()
  const m = c.m
  const finished = m.ok || m.tries >= 2
  const ready = m.choice != null && wordCount(m.why || '') >= 5

  const select = (i: number) => { if (!finished) patch({ m: { ...m, choice: i, wrong: false } }) }

  const submit = () => {
    if (finished) { patch({ locked: true }); go(6); return }
    const ok = m.choice === def.method.correct
    patch({ m: { ...m, tries: m.tries + 1, ok, wrong: !ok } })
  }

  return (
    <>
      <h2>Шаг 5. Выбор метода</h2>
      <p>{def.method.question}</p>
      <OptionList selected={m.choice} onSelect={select}
        options={def.method.options.map((label, i) => ({ label, className: m.wrong && m.choice === i ? 'wrong' : '' }))} />
      <label className="f" htmlFor="why5">Обоснуйте выбор (2–3 предложения)</label>
      <textarea className="t" id="why5" style={{ minHeight: 80 }} readOnly={finished} value={m.why || ''}
        onChange={e => patch({ m: { ...m, why: e.target.value } })} />
      {m.ok && <Note kind="ok">Метод выбран верно. После перехода дальше шаги 1–4 станут доступны только для просмотра.</Note>}
      {m.wrong && m.tries === 1 && <Note kind="warn">{def.method.retryHint} Попытка 2 из 2.</Note>}
      {m.tries >= 2 && !m.ok && <Note kind="bad">{def.method.failNote}</Note>}
      <StepFooter canNext={finished || ready} why="Выберите метод и напишите обоснование (от 5 слов)"
        label={finished ? 'Далее' : t('check')} onNext={submit} />
    </>
  )
}
