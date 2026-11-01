import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { useIsPhone } from '@/core/useMediaQuery'
import { RUN_STAGES } from '@/domain/code/CodeRunner'
import type { CodeLang } from '@/domain/progress/types'
import { Note } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

const otherLang = (l: CodeLang): CodeLang => (l === 'R' ? 'Python' : 'R')

/** Шаблон кода: [0], [1] … превращаются в поля для пропусков. */
function TemplateEditor({ lines, blanks, readOnly, onChange }: {
  lines: string[]; blanks: string[]; readOnly: boolean; onChange: (i: number, v: string) => void
}) {
  return (
    <div className="editor" style={{ marginTop: 12 }}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {line.split(/\[(\d)\]/).map((part, pi) => {
            if (pi % 2 === 0) return <Fragment key={pi}>{part}</Fragment>
            const i = Number(part)
            return <input key={pi} className="blank" aria-label={`Пропуск ${i + 1}`} readOnly={readOnly}
              value={blanks[i] ?? ''} onChange={e => onChange(i, e.target.value.trim())} />
          })}
          {li < lines.length - 1 && '\n'}
        </Fragment>
      ))}
    </div>
  )
}

function ResultChart({ title, bars }: { title: string; bars: [string, number][] }) {
  return (
    <div className="hbars" role="img" aria-label={title}>
      {bars.map(([label, v]) => (
        <div className="hb" key={label}><span>{label}</span><div className="hbt"><i style={{ width: `${v}%` }} /></div>
          <b>{String(v).replace('.', ',')}%</b></div>
      ))}
    </div>
  )
}

export function Step6Code() {
  const { t } = useTranslation()
  const { codeRunner, research } = useServices()
  const { def, progress: c, level, patch, go, openTutor } = useCaseSession()
  const phone = useIsPhone()
  const [running, setRunning] = useState(-1)
  const freeMode = level === 'post' && !c.shown

  // На телефоне WebR не работает — только Python
  useEffect(() => { if (phone && c.lang === 'R') patch({ lang: 'Python', ran: false }) }, [phone, c.lang, patch])

  const run = async () => {
    patch(p => ({ runs: p.runs + 1, codeErr: '', ran: false }))
    const result = await codeRunner.run(
      { def, lang: c.lang, mode: freeMode ? 'free' : 'template', blanks: c.blanks, code: c.free },
      setRunning,
    )
    setRunning(-1)
    research.track('code_run', { lang: c.lang, ok: result.ok })
    patch(result.ok ? { ran: true } : { codeErr: result.error })
  }

  const showCode = () => patch({ shown: true, blanks: [...def.code.blankAnswers], codeErr: '' })

  return (
    <>
      <h2>Шаг 6. Анализ в R или Python</h2>
      <div className="spread">
        <p style={{ margin: 0 }}>{level === 'post'
          ? 'Напишите код анализа самостоятельно. Справка доступна у репетитора (Ctrl+K в редакторе).'
          : 'Заполните пропуски в шаблоне и запустите код.'}</p>
        <div className="seg" role="group" aria-label="Язык">
          {(['R', 'Python'] as CodeLang[]).map(l => (
            <button key={l} aria-pressed={c.lang === l} disabled={l === 'R' && phone}
              title={l === 'R' && phone ? 'На телефоне доступен только Python' : undefined}
              onClick={() => patch({ lang: l, ran: false, codeErr: '' })}>{l}</button>
          ))}
        </div>
      </div>
      {phone && <Note kind="warn">На телефоне доступен только Python. Для этого шага рекомендуем компьютер: там доступны R и Python и удобнее работать с кодом. Работа сохранится — можно продолжить с компьютера.</Note>}

      {freeMode
        ? <div className="editor" style={{ marginTop: 12 }}>
            <textarea aria-label="Код" value={c.free} onChange={e => patch({ free: e.target.value })}
              placeholder={c.lang === 'R' ? '# Напишите анализ на R' : '# Напишите анализ на Python'} />
          </div>
        : <TemplateEditor lines={def.code.templates[c.lang]} blanks={c.blanks} readOnly={c.shown}
            onChange={(i, v) => patch(p => { const b = [...p.blanks]; b[i] = v; return { blanks: b } })} />}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={running >= 0} onClick={run}>▶ {t('run')}</button>
        <span className="small muted">Запусков: {c.runs}</span>
        {c.runs >= 3 && !c.ran && !c.shown && <button className="btn ghost" onClick={showCode}>Показать готовый код (−5 баллов)</button>}
      </div>
      {running >= 0 && (
        <div className="stages">
          {RUN_STAGES.map((s, i) => <div key={s} className={i < running ? 'ok' : i === running ? 'on' : 'wait'}>{s}</div>)}
        </div>
      )}
      {c.codeErr && (
        <Note kind="bad"><b>Ошибка выполнения.</b> {c.codeErr} <button className="btn ghost" onClick={openTutor}>Объяснить ошибку</button></Note>
      )}
      {c.ran && (
        <>
          <div className="out">{def.code.outputs[c.lang]}</div>
          <ResultChart {...def.code.chart} />
          <p className="small muted">Второй язык ({otherLang(c.lang)}) откроется для сравнения после завершения кейса.</p>
        </>
      )}
      <StepFooter canNext={c.ran} why="Код должен выполниться без ошибки" onNext={() => go(7)} />
    </>
  )
}
