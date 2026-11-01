import { useServices } from '@/app/ServicesContext'
import type { AttemptStatus, ExportKind } from '@/api/types'
import { Note, Who } from '@/ui/common'
import type { OverviewState } from './useOverview'

const STATUS: Record<AttemptStatus, string> = { in_progress: 'В процессе', completed: 'Завершён', disputed: 'Оспаривается', confirmed: 'Подтверждён' }
const EXPORTS: [ExportKind, string][] = [
  ['attempts', 'Результаты кейсов'], ['events', 'События (ИИ, код, шаги)'], ['diagnostics', 'Диагностика'], ['disputes', 'Оспаривания'],
]

export function ParticipantsTab({ overview }: { overview: OverviewState }) {
  const { teacher } = useServices()
  const { data, error, reload } = overview
  const people = data?.people ?? []

  return (
    <>
      <div className="spread"><h1>Участники и выгрузка</h1><button className="btn" onClick={reload}>Обновить</button></div>
      <div className="row" style={{ margin: '6px 0 16px' }}>
        {EXPORTS.map(([k, label]) => <a key={k} className="btn" href={teacher.exportUrl(k)}>{label} · CSV</a>)}
      </div>
      {error && <Note kind="bad">{error}</Note>}
      <div className="tbl"><table>
        <thead><tr><th>Участник</th><th>Группа</th><th>Роль</th><th>Кейс</th><th>Шаг</th><th>Баллы</th><th>Статус</th><th>Переходы к ИИ</th></tr></thead>
        <tbody>
          {people.length ? people.map(p => (
            <tr key={`${p.code}|${p.case_id ?? ''}`}>
              <td><Who p={p} /></td><td>{p.grp || ''}</td><td>{p.role === 'specialist' ? 'специалист' : 'студент'}</td>
              <td>{p.case_id ?? '—'}</td><td>{p.max_step ?? '—'}</td><td>{p.score ?? '—'} {p.grade ? `· ${p.grade}` : ''}</td>
              <td>{p.status ? STATUS[p.status] || p.status : 'не начат'}</td><td>{p.tutor_opens || 0}</td>
            </tr>
          )) : <tr><td colSpan={8} className="muted">{data ? 'Нет участников' : 'Загрузка…'}</td></tr>}
        </tbody>
      </table></div>
      <p className="small muted" style={{ marginTop: 10 }}>В выгрузках только коды участников. Таблица «код — ФИО» хранится у автора исследования отдельно.</p>
    </>
  )
}
