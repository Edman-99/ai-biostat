import { useServices } from '@/app/ServicesContext'
import type { AttemptStatus, ExportKind, OverviewPerson } from '@/api/types'
import { useIsPhone } from '@/core/useMediaQuery'
import { Note, Who } from '@/ui/common'
import { ImportParticipants } from './ImportParticipants'
import { ResetPasswordButton } from './ResetPasswordButton'
import type { OverviewState } from './useOverview'

const STATUS: Record<AttemptStatus, string> = { in_progress: 'В процессе', completed: 'Завершён', disputed: 'Оспаривается', confirmed: 'Подтверждён' }
const EXPORTS: [ExportKind, string][] = [
  ['attempts', 'Результаты кейсов'], ['events', 'События (ИИ, код, шаги)'], ['diagnostics', 'Диагностика'], ['disputes', 'Оспаривания'],
]

const roleName = (p: OverviewPerson) => (p.role === 'specialist' ? 'специалист' : 'студент')
const statusName = (p: OverviewPerson) => (p.status ? STATUS[p.status] || p.status : 'не начат')
const scoreText = (p: OverviewPerson) => `${p.score ?? '—'}${p.grade ? ` · ${p.grade}` : ''}`
const rowKey = (p: OverviewPerson) => `${p.code}|${p.case_id ?? ''}`

function PeopleTable({ people }: { people: OverviewPerson[] }) {
  return (
    <div className="tbl"><table>
      <thead><tr><th>Участник</th><th>Группа</th><th>Роль</th><th>Кейс</th><th>Шаг</th><th>Баллы</th><th>Статус</th><th>Переходы к ИИ</th><th>Пароль</th></tr></thead>
      <tbody>{people.map(p => (
        <tr key={rowKey(p)}>
          <td><Who p={p} /></td><td>{p.grp || ''}</td><td>{roleName(p)}</td>
          <td>{p.case_id ?? '—'}</td><td>{p.max_step ?? '—'}</td><td>{scoreText(p)}</td>
          <td>{statusName(p)}</td><td>{p.tutor_opens || 0}</td><td><ResetPasswordButton code={p.code} /></td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}

/** На телефоне — карточки: таблица из 9 столбцов на узком экране нечитаема. */
function PeopleCards({ people }: { people: OverviewPerson[] }) {
  return (
    <div className="pcards">{people.map(p => (
      <div className="pcard" key={rowKey(p)}>
        <div className="spread"><b><Who p={p} />{p.grp ? <span className="muted"> · {p.grp}</span> : ''}</b><span className="tag">{statusName(p)}</span></div>
        <div className="meta">
          <span>{roleName(p)}</span>
          {p.case_id && <span>кейс {p.case_id} · шаг {p.max_step ?? '—'}</span>}
          {p.score != null && <span>баллы {scoreText(p)}</span>}
          <span>к ИИ: {p.tutor_opens || 0}</span>
        </div>
        <div><ResetPasswordButton code={p.code} /></div>
      </div>
    ))}</div>
  )
}

export function ParticipantsTab({ overview }: { overview: OverviewState }) {
  const { teacher } = useServices()
  const phone = useIsPhone()
  const { data, error, reload } = overview
  const people = data?.people ?? []

  return (
    <>
      <div className="spread"><h1>Участники и выгрузка</h1><button className="btn" onClick={reload}>Обновить</button></div>
      <ImportParticipants onImported={reload} />
      <div className="row exports">
        {EXPORTS.map(([k, label]) => <a key={k} className="btn" href={teacher.exportUrl(k)}>{label} · CSV</a>)}
      </div>
      {error && <Note kind="bad">{error}</Note>}
      {!people.length ? <p className="muted">{data ? 'Нет участников' : 'Загрузка…'}</p>
        : phone ? <PeopleCards people={people} /> : <PeopleTable people={people} />}
      <p className="small muted" style={{ marginTop: 10 }}>В выгрузках только коды участников. Таблица «код — ФИО» хранится у автора исследования отдельно.</p>
    </>
  )
}
