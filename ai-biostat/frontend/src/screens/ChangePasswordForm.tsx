import { useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import { Note } from '@/ui/common'

/** Свой пароль вместо выданного преподавателем. */
export function ChangePasswordForm() {
  const { session } = useServices()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)

  const problem =
    !oldPwd.trim() ? 'Введите текущий пароль'
    : newPwd.trim().length < 6 ? 'Новый пароль — не короче 6 символов'
    : newPwd !== repeat ? 'Пароли не совпадают'
    : ''

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      await session.changePassword(oldPwd, newPwd)
      setOldPwd(''); setNewPwd(''); setRepeat('')
      setMsg({ kind: 'ok', text: 'Пароль изменён. В следующий раз входите с новым паролем.' })
    } catch (e) { setMsg({ kind: 'bad', text: (e as Error).message }) }
    finally { setBusy(false) }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>Сменить пароль</h2>
      <p className="small muted">Поставьте свой пароль, который легко запомнить, — от 6 символов, можно буквы и цифры.</p>
      <label className="f" htmlFor="pold">Текущий пароль</label>
      <input className="t" id="pold" type="password" autoComplete="current-password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
      <label className="f" htmlFor="pnew">Новый пароль</label>
      <input className="t" id="pnew" type="password" autoComplete="new-password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
      <label className="f" htmlFor="prep">Новый пароль ещё раз</label>
      <input className="t" id="prep" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} />
      <div style={{ marginTop: 20 }}>
        <button className="btn primary" disabled={!!problem || busy} onClick={submit}>Сменить пароль</button>
        {problem && (oldPwd || newPwd || repeat) && <div className="hint">{problem}</div>}
      </div>
      {msg && <Note kind={msg.kind}>{msg.text}</Note>}
    </div>
  )
}
