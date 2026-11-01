import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { BLOCK_KEY } from '@/domain/diagnostic/Diagnostic'
import { OptionList, ProgressBar } from '@/ui/common'
import { TopBar } from '@/ui/TopBar'

export function DiagnosticScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const { app, diagnostic } = useServices()
  const { idx, answers } = useAppState().diag
  const q = diagnostic.question(idx)
  const last = idx === diagnostic.count - 1

  return (
    <>
      <TopBar />
      <main className="center" style={{ maxWidth: 620 }}>
        <div className="spread small muted">
          <span>{t('diag.header', { block: t(`blocks.${BLOCK_KEY[q.block]}`) })}</span>
          <span>{t('diag.counter', { n: idx + 1, total: diagnostic.count })} <span className="muted">{t('diag.fullNote')}</span></span>
        </div>
        <ProgressBar pct={idx / diagnostic.count * 100} style={{ margin: '8px 0 22px' }} />
        <h2>{pick(q.question, lang)}</h2>
        <OptionList options={q.options.map(o => ({ label: pick(o, lang) }))} selected={answers[idx]} onSelect={i => app.answerDiag(idx, i)} />
        <p className="small muted">{t('diag.note')}</p>
        <button className="btn primary" disabled={answers[idx] == null}
          onClick={() => (last ? app.navigate('diagres') : app.nextDiagQuestion())}>
          {last ? t('diag.finish') : t('diag.answer')}
        </button>
      </main>
    </>
  )
}
