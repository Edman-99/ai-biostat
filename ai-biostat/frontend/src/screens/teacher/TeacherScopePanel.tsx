import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import type { TeacherScope } from '@/api/types'
import { Note } from '@/ui/common'

/**
 * Какие группы видит преподаватель. Обычному — его группы; главному (scope = null) — список всех
 * преподавателей и закреплённых за ними групп. Закрепление меняется на сервере (aib-participants assign).
 */
export function TeacherScopePanel() {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const scope = useAppState().me?.scope
  const admin = scope === null || scope === undefined
  const [list, setList] = useState<TeacherScope[] | null>(null)

  useEffect(() => {
    if (!admin) return
    let alive = true
    teacher.teachers().then(l => { if (alive) setList(l) }).catch(() => { if (alive) setList([]) })
    return () => { alive = false }
  }, [admin, teacher])

  if (!admin) {
    return scope.length
      ? <Note>{t('teacher.scope.mine', { groups: scope.join(', ') })}</Note>
      : <Note kind="warn">{t('teacher.scope.none')}</Note>
  }

  const groupsText = (g: string[]) => (g.includes('*') ? t('teacher.scope.allGroups') : g.join(', ') || t('teacher.scope.noGroups'))
  return (
    <details className="panel csv-import" style={{ marginBottom: 18 }}>
      <summary>{t('teacher.scope.teachersTitle')}</summary>
      <p className="small muted" style={{ marginTop: 10 }}>{t('teacher.scope.all')}</p>
      {list === null ? <p className="muted">{t('common.loading')}</p> : (
        <div className="tbl"><table>
          <thead><tr><th>{t('common.code')}</th><th>{t('teacher.scope.groups')}</th></tr></thead>
          <tbody>{list.map(x => <tr key={x.code}><td>{x.code}</td><td style={{ whiteSpace: 'normal' }}>{groupsText(x.groups)}</td></tr>)}</tbody>
        </table></div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>{t('teacher.scope.howTo')}</p>
    </details>
  )
}
