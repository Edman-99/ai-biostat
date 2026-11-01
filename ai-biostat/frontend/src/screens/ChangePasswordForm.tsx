import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { ApiError } from '@/core/http/HttpClient'
import { Note } from '@/ui/common'

/** Свой пароль вместо выданного преподавателем. */
export function ChangePasswordForm() {
  const { t } = useTranslation()
  const { session } = useServices()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)

  const problem =
    !oldPwd.trim() ? t('password.enterCurrent')
    : newPwd.trim().length < 6 ? t('password.tooShort')
    : newPwd !== repeat ? t('password.mismatch')
    : ''

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      await session.changePassword(oldPwd, newPwd)
      setOldPwd(''); setNewPwd(''); setRepeat('')
      setMsg({ kind: 'ok', text: t('password.done') })
    } catch (e) {
      // длина проверена выше, поэтому 400 от сервера — неверный текущий пароль
      setMsg({ kind: 'bad', text: e instanceof ApiError && e.status === 400 ? t('password.wrongCurrent') : (e as Error).message })
    } finally { setBusy(false) }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>{t('password.title')}</h2>
      <p className="small muted">{t('password.intro')}</p>
      <label className="f" htmlFor="pold">{t('password.current')}</label>
      <input className="t" id="pold" type="password" autoComplete="current-password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
      <label className="f" htmlFor="pnew">{t('password.new')}</label>
      <input className="t" id="pnew" type="password" autoComplete="new-password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
      <label className="f" htmlFor="prep">{t('password.repeat')}</label>
      <input className="t" id="prep" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} />
      <div style={{ marginTop: 20 }}>
        <button className="btn primary" disabled={!!problem || busy} onClick={submit}>{t('password.submit')}</button>
        {problem && (oldPwd || newPwd || repeat) && <div className="hint">{problem}</div>}
      </div>
      {msg && <Note kind={msg.kind}>{msg.text}</Note>}
    </div>
  )
}
