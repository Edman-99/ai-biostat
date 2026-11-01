import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useServices } from '@/app/ServicesContext'

type Phase = { kind: 'idle' } | { kind: 'confirm' } | { kind: 'busy' } | { kind: 'done'; password: string } | { kind: 'error'; message: string }

/** «Новый пароль» с подтверждением: старый пароль сразу перестаёт работать, участник выходит из системы. */
export function ResetPasswordButton({ code }: { code: string }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const reset = async () => {
    setPhase({ kind: 'busy' })
    try { setPhase({ kind: 'done', password: (await teacher.resetPassword(code)).password }) }
    catch (e) { setPhase({ kind: 'error', message: (e as Error).message }) }
  }

  switch (phase.kind) {
    case 'confirm':
      return (
        <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <span className="small muted">{t('teacher.reset.confirm')}</span>
          <button className="btn small" style={{ minHeight: 32, padding: '4px 10px' }} onClick={reset}>{t('common.yes')}</button>
          <button className="btn ghost small" onClick={() => setPhase({ kind: 'idle' })}>{t('common.cancel')}</button>
        </span>
      )
    case 'busy':
      return <span className="small muted">{t('teacher.reset.issuing')}</span>
    case 'done':
      return <span className="small">{t('teacher.reset.done')} <code style={{ fontSize: 15, fontWeight: 600 }}>{phase.password}</code></span>
    case 'error':
      return <span className="small" style={{ color: 'var(--bad)' }}>{phase.message}</span>
    default:
      return <button className="btn ghost small" onClick={() => setPhase({ kind: 'confirm' })}>{t('teacher.reset.button')}</button>
  }
}
