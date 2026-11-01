import { useState } from 'react'
import { useAppState, useServices } from '@/app/ServicesContext'
import { TopBar } from '@/ui/TopBar'
import { ChangePasswordForm } from './ChangePasswordForm'

const ROLE_NAME = { student: 'Студент', specialist: 'Специалист', teacher: 'Преподаватель' }

export function ProfileScreen() {
  const { app, session } = useServices()
  const me = useAppState().me!
  const [last, setLast] = useState(me.last_name || '')
  const [first, setFirst] = useState(me.first_name || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setBusy(true); setMsg('Сохраняем…')
    try {
      await session.updateProfile(first, last)
      setMsg('Сохранено')
      setTimeout(() => app.closeProfile(), 500)
    } catch (e) { setMsg((e as Error).message); setBusy(false) }
  }

  return (
    <>
      <TopBar />
      <main className="center"><div className="panel">
        <h1>Профиль</h1>
        <p className="muted">{ROLE_NAME[me.role]} · код <b>{me.code}</b>{me.group ? ` · группа ${me.group}` : ''}</p>
        <p className="small muted">Имя и фамилия видны только вам и преподавателю. В выгрузках для исследования используется только код.</p>
        <label className="f" htmlFor="pln">Фамилия</label>
        <input className="t" id="pln" value={last} onChange={e => setLast(e.target.value)} autoComplete="family-name" />
        <label className="f" htmlFor="pfn">Имя</label>
        <input className="t" id="pfn" value={first} onChange={e => setFirst(e.target.value)} autoComplete="given-name" />
        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn" onClick={() => app.closeProfile()}>← Назад</button>
          <button className="btn primary" disabled={busy} onClick={save}>Сохранить</button>
        </div>
        <div className="hint">{msg}</div>
      </div>
      <ChangePasswordForm />
      </main>
    </>
  )
}
