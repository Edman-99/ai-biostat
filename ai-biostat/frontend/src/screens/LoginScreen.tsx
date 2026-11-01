import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { ApiError } from '@/core/http/HttpClient'
import { TopBar } from '@/ui/TopBar'

export function LoginScreen() {
  const { session } = useServices()
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = code.trim().length >= 3 && pwd.trim().length >= 6

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true); setError('')
    try { await session.login(code, pwd) }
    catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      setError(status === 401 ? t('login.wrong') : status === 429 ? t('login.tooMany') : (e as Error).message)
      setBusy(false)
    }
  }

  const hint = busy ? t('login.checking') : error || (valid ? '' : t('login.hint'))

  return (
    <>
      <TopBar />
      <main className="center"><div className="panel">
        <h1>{t('login.title')}</h1>
        <p className="muted">{t('login.intro')}</p>
        <label className="f" htmlFor="code">{t('login.code')}</label>
        <input className="t" id="code" placeholder={t('login.codePh')} autoComplete="off" value={code}
          onChange={e => { setCode(e.target.value); setError('') }} />
        <label className="f" htmlFor="otp">{t('login.password')}</label>
        <input className="t" id="otp" type="password" placeholder={t('login.passwordPh')}
          autoComplete="current-password" value={pwd}
          onChange={e => { setPwd(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }} />
        <div style={{ marginTop: 20 }}>
          <button className="btn primary" disabled={!valid || busy} style={{ width: '100%' }} onClick={submit}>{t('login.enter')}</button>
          <div className="hint">{hint}</div>
        </div>
      </div></main>
    </>
  )
}
