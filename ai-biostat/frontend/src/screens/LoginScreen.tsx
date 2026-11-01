import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { TopBar } from '@/ui/TopBar'

const HINT = 'Введите код участника и 6 цифр пароля'

export function LoginScreen() {
  const { session } = useServices()
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(HINT)
  const valid = code.trim().length >= 3 && /^\d{6}$/.test(pwd)

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true); setMsg('Проверяем…')
    try { await session.login(code, pwd) }
    catch (e) { setMsg((e as Error).message); setBusy(false) }
  }

  return (
    <>
      <TopBar />
      <main className="center"><div className="panel">
        <h1>{t('login')}</h1>
        <p className="muted">Пилотная апробация: код участника и пароль выдаёт преподаватель. Личные данные не нужны.</p>
        <label className="f" htmlFor="code">{t('code')}</label>
        <input className="t" id="code" placeholder="Например, P-0142" autoComplete="off" value={code}
          onChange={e => { setCode(e.target.value); setMsg(HINT) }} />
        <label className="f" htmlFor="otp">{t('otp')}</label>
        <input className="t" id="otp" type="password" inputMode="numeric" maxLength={6} placeholder="6 цифр"
          autoComplete="current-password" value={pwd}
          onChange={e => { setPwd(e.target.value); setMsg(HINT) }}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }} />
        <div style={{ marginTop: 20 }}>
          <button className="btn primary" disabled={!valid || busy} style={{ width: '100%' }} onClick={submit}>{t('enter')}</button>
          <div className="hint">{valid && msg === HINT ? '' : msg}</div>
        </div>
      </div></main>
    </>
  )
}
