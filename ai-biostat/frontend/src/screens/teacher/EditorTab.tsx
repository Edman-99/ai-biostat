import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { catalogEntry } from '@/cases/CaseRegistry'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'

// Макет: реальный редактор кейсов — отдельный этап (CLAUDE.md, п. 7).
type Status = 'published' | 'draft' | 'biostat' | 'eduExpert'
const CASES_ADMIN: [string, string, Status][] = [
  ['1', '0.1', 'biostat'], ['4', '0.1', 'biostat'], ['21', '0.2', 'published'], ['22', '0.1', 'draft'], ['23', '0.1', 'eduExpert'],
]

const statusColor = (st: Status) => (st === 'published' ? 'var(--ok)' : st === 'draft' ? undefined : 'var(--warn)')

function NewCaseForm({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation()
  const e = (k: string) => t(`teacher.editor.${k}`)
  return (
    <>
      <h1>{e('newTitle')}</h1>
      <p className="muted">{e('newIntro')}</p>
      <div className="panel form">
        <label className="f">{e('name')}</label><input className="t" placeholder={e('namePh')} />
        <div className="row">
          <div style={{ flex: 1, minWidth: 180 }}><label className="f">{e('level')}</label>
            <select className="t"><option>{t('home.level.basic')}</option><option>{t('home.level.advanced')}</option></select></div>
          <div style={{ flex: 1, minWidth: 180 }}><label className="f">{e('langVersion')}</label>
            <select className="t"><option>Русский</option><option>Қазақша</option><option>English</option></select></div>
        </div>
        <label className="f">{e('situation')}</label><textarea className="t" placeholder={e('situationPh')} />
        <label className="f">{e('dataFile')}</label><input className="t" type="file" accept=".csv,.xlsx" />
        <p className="hint">{e('dataHint')}</p>
        <label className="f">{e('vars')}</label><textarea className="t" style={{ minHeight: 80 }} placeholder={e('varsPh')} />
        <label className="f">{e('errors')}</label><textarea className="t" style={{ minHeight: 70 }} />
        <label className="f">{e('method')}</label><textarea className="t" style={{ minHeight: 70 }} />
        <label className="f">{e('refCode')}</label><textarea className="t code" style={{ minHeight: 100 }} />
        <label className="f">{e('rubric')}</label><textarea className="t" style={{ minHeight: 80 }} />
        <label className="f">{e('trap')}</label><textarea className="t" style={{ minHeight: 70 }} />
        <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>{t('common.cancel')}</button><button className="btn">{e('preview')}</button>
          <button className="btn primary">{e('submit')}</button>
        </div>
      </div>
    </>
  )
}

export function EditorTab() {
  const { t } = useTranslation()
  const lang = useLang()
  const [editing, setEditing] = useState(false)
  if (editing) return <NewCaseForm onCancel={() => setEditing(false)} />
  return (
    <>
      <div className="spread"><h1>{t('teacher.tabs.editor')}</h1><button className="btn primary" onClick={() => setEditing(true)}>{t('teacher.editor.create')}</button></div>
      <p className="muted">{t('teacher.editor.intro')}</p>
      <div className="tbl"><table>
        <thead><tr>{(t('teacher.editor.headers', { returnObjects: true }) as string[]).map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{CASES_ADMIN.map(([id, v, st]) => {
          const entry = catalogEntry(id)
          return (
            <tr key={id}><td>{id}</td><td>{entry ? pick(entry.title, lang) : ''}</td><td>{v}</td>
              <td><span className="tag" style={{ color: statusColor(st) }}>{t(`teacher.editor.status.${st}`)}</span></td></tr>
          )
        })}</tbody>
      </table></div>
    </>
  )
}
