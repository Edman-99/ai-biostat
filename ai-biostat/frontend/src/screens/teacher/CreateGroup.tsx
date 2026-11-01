import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { IssuedPassword, Lang } from '@/api/types'
import { Note } from '@/ui/common'
import { IssuedPasswords } from './IssuedPasswords'

type Role = 'student' | 'specialist'
const LANGS: [Lang, string][] = [['kk', 'Қазақша'], ['ru', 'Русский'], ['en', 'English']]

/** «Создать группу»: преподаватель указывает только группу и число людей — коды и пароли выдаёт система. */
export function CreateGroup({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const [group, setGroup] = useState('')
  const [count, setCount] = useState(15)
  const [role, setRole] = useState<Role>('student')
  const [lang, setLang] = useState<Lang>('kk')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<IssuedPassword[]>([])
  const valid = group.trim().length > 0 && count >= 1 && count <= 100

  const create = async () => {
    setBusy(true); setError(''); setIssued([])
    try {
      const res = await teacher.createGroup(group.trim(), count, role, lang)
      setIssued(res.added)
      onCreated()
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <h3>{t('teacher.group.title')}</h3>
      <p className="small muted">{t('teacher.group.intro')}</p>
      <div className="group-form">
        <div className="g-name"><label className="f" htmlFor="gname">{t('teacher.group.name')}</label>
          <input className="t" id="gname" placeholder={t('teacher.group.namePh')} value={group} maxLength={30} onChange={e => setGroup(e.target.value)} /></div>
        <div className="g-count"><label className="f" htmlFor="gcount">{t('teacher.group.count')}</label>
          <input className="t" id="gcount" type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))} /></div>
        <div><span className="f" style={{ display: 'block' }}>{t('teacher.group.role')}</span>
          <div className="seg" role="group">
            {(['student', 'specialist'] as Role[]).map(r => (
              <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>{t(`teacher.group.${r}s`)}</button>
            ))}
          </div></div>
        <div><span className="f" style={{ display: 'block' }}>{t('teacher.group.lang')}</span>
          <div className="seg" role="group">
            {LANGS.map(([code, label]) => <button key={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>)}
          </div></div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={!valid || busy} onClick={create}>{busy ? t('teacher.group.creating') : t('teacher.group.create')}</button>
      </div>
      {error && <Note kind="bad">{error}</Note>}
      {issued.length > 0 && <Note kind="ok"><b>{t('teacher.import.added', { n: issued.length })}</b> · {issued[0].code} – {issued[issued.length - 1].code}</Note>}
      <IssuedPasswords issued={issued} />
    </div>
  )
}
