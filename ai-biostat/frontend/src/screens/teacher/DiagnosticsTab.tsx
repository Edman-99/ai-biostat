import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { DiagGroupStatus } from '@/api/types'
import { Note } from '@/ui/common'

/**
 * Диагностика по группам преподавателя: сколько прошли входную (А) и итоговую (Б); итоговую преподаватель
 * открывает своей группе в конце пилота (студенты увидят приглашение на главной и в разделе «Диагностика»).
 */
export function DiagnosticsTab() {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const [rows, setRows] = useState<DiagGroupStatus[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState('')

  const load = useCallback(() => {
    teacher.diagnosticsStatus().then(r => { setRows(r); setError('') }).catch(e => setError((e as Error).message))
  }, [teacher])
  useEffect(load, [load])

  const toggle = async (g: DiagGroupStatus) => {
    setBusy(g.grp); setConfirm('')
    try { await teacher.setExitOpen(g.grp, !g.exit_open); load() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy('') }
  }

  return (
    <>
      <div className="spread">
        <div>
          <p className="eyebrow">{t('teacher.diagTab.eyebrow')}</p>
          <h1 className="serif">{t('teacher.tabs.diag')}</h1>
        </div>
        <button className="btn" onClick={load}>{t('common.refresh')}</button>
      </div>
      <p className="muted">{t('teacher.diagTab.intro')}</p>
      {error && <Note kind="bad">{error}</Note>}
      {!rows ? <p className="muted">{t('common.loading')}</p> : !rows.length ? <p className="muted">{t('teacher.diagTab.empty')}</p> : (
        <div className="tbl"><table>
          <thead><tr>
            <th>{t('teacher.diagTab.group')}</th><th>{t('teacher.diagTab.people')}</th>
            <th>{t('teacher.diagTab.entryDone')}</th><th>{t('teacher.diagTab.exitDone')}</th>
            <th>{t('teacher.diagTab.status')}</th><th />
          </tr></thead>
          <tbody>{rows.map(g => (
            <tr key={g.grp}>
              <td><b>{g.grp}</b></td>
              <td className="num">{g.people}</td>
              <td className="num">{g.entry_done} / {g.people}</td>
              <td className="num">{g.exit_done} / {g.people}</td>
              <td>{g.exit_open ? <span className="tag" style={{ color: 'var(--ok)' }}>{t('teacher.diagTab.open')}</span> : <span className="tag">{t('teacher.diagTab.closed')}</span>}</td>
              <td>
                {confirm === g.grp ? (
                  <span className="row" style={{ gap: 6 }}>
                    <button className="btn primary small" disabled={busy === g.grp} onClick={() => toggle(g)}>{t('teacher.diagTab.confirmYes')}</button>
                    <button className="btn ghost small" onClick={() => setConfirm('')}>{t('common.cancel')}</button>
                  </span>
                ) : (
                  <button className={`btn small ${g.exit_open ? '' : 'primary'}`} disabled={busy === g.grp}
                    onClick={() => (g.exit_open ? toggle(g) : setConfirm(g.grp))}>
                    {g.exit_open ? t('teacher.diagTab.closeBtn') : t('teacher.diagTab.openBtn')}
                  </button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {confirm && <Note kind="warn">{t('teacher.diagTab.confirm', { group: confirm })}</Note>}
      <p className="small muted" style={{ marginTop: 12 }}>{t('teacher.diagTab.note')}</p>
    </>
  )
}
