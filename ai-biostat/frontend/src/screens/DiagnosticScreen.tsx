import { useTranslation } from 'react-i18next'
import type { DiagKind } from '@/app/AppStore'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { OptionList, ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

/** Вопросы диагностики: входная (вариант А, сразу после первого входа) или итоговая (вариант Б, открывает преподаватель). */
export function DiagnosticScreen({ kind = 'entry' }: { kind?: DiagKind }) {
  const { t } = useTranslation()
  const lang = useLang()
  const services = useServices()
  const { app, research } = services
  const evaluator = kind === 'exit' ? services.exitDiagnostic : services.diagnostic
  const state = useAppState()
  const { idx, answers } = kind === 'exit' ? state.exit : state.diag
  const q = evaluator.question(idx)
  const last = idx === evaluator.count - 1

  const next = () => {
    if (!last) { app.nextDiagQuestion(kind); return }
    // результат отправляется один раз — при завершении
    const pct = evaluator.percentages(answers)
    research.diagnostic(evaluator.variant, answers, pct)
    app.finishDiag(kind, pct)
    app.navigate('diagres')
  }

  return (
    <>
      <TopBar />
      <main className="center" style={{ maxWidth: 620 }}>
        <div className="spread small muted">
          <span>{t(kind === 'exit' ? 'diag.exitHeader' : 'diag.header', { block: t(`blocks.${BLOCK_KEY[q.block]}`) })}</span>
          <span>{t('diag.counter', { n: idx + 1, total: evaluator.count })}</span>
        </div>
        <ProgressBar pct={idx / evaluator.count * 100} style={{ margin: '8px 0 22px' }} />
        <h2>{pick(q.question, lang)}</h2>
        <OptionList options={q.options.map(o => ({ label: pick(o, lang) }))} selected={answers[idx]} onSelect={i => app.answerDiag(kind, idx, i)} />
        <p className="small muted">{t('diag.note')}</p>
        <button className="btn primary" disabled={answers[idx] == null} onClick={next}>
          {last ? t('diag.finish') : t('diag.answer')}
        </button>
      </main>
    </>
  )
}

export const ExitDiagnosticScreen = () => <DiagnosticScreen kind="exit" />
