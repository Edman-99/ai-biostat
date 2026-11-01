import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import { TopBar } from '@/ui/TopBar'
import { ChangePasswordForm } from './ChangePasswordForm'

export function ProfileScreen() {
  const { t } = useTranslation()
  const { app, session } = useServices()
  const me = useAppState().me!
  const [last, setLast] = useState(me.last_name || '')
  const [first, setFirst] = useState(me.first_name || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setBusy(true); setMsg(t('common.saving'))
    try {
      await session.updateProfile(first, last)
      setMsg(t('common.saved'))
      setTimeout(() => app.closeProfile(), 500)
    } catch (e) { setMsg((e as Error).message); setBusy(false) }
  }

  return (
    <>
      <TopBar />
      <main className="center">
        <div className="panel">
          <h1>{t('profile.title')}</h1>
          <p className="muted">{t(`roles.${me.role}`)} · {t('common.code')} <b>{me.code}</b>{me.group ? ` · ${t('common.group', { group: me.group })}` : ''}</p>
          <p className="small muted">{t('profile.privacy')}</p>
          <label className="f" htmlFor="pln">{t('profile.lastName')}</label>
          <input className="t" id="pln" value={last} onChange={e => setLast(e.target.value)} autoComplete="family-name" />
          <label className="f" htmlFor="pfn">{t('profile.firstName')}</label>
          <input className="t" id="pfn" value={first} onChange={e => setFirst(e.target.value)} autoComplete="given-name" />
          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => app.closeProfile()}>{t('common.backArrow')}</button>
            <button className="btn primary" disabled={busy} onClick={save}>{t('common.save')}</button>
          </div>
          <div className="hint">{msg}</div>
        </div>
        <ChangePasswordForm />
      </main>
    </>
  )
}
