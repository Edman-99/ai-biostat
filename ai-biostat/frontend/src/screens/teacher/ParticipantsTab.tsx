import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { ExportKind, OverviewPerson } from '@/api/types'
import { useIsPhone } from '@/core/useMediaQuery'
import { Note, Who } from '@/ui/common'
import { CreateGroup } from './CreateGroup'
import { ImportParticipants } from './ImportParticipants'
import { ResetPasswordButton } from './ResetPasswordButton'
import type { OverviewState } from './useOverview'

const EXPORTS: ExportKind[] = ['attempts', 'events', 'diagnostics', 'disputes']

const scoreText = (p: OverviewPerson) => `${p.score ?? '—'}${p.grade ? ` · ${p.grade}` : ''}`
const rowKey = (p: OverviewPerson) => `${p.code}|${p.case_id ?? ''}`

function usePersonLabels() {
  const { t } = useTranslation()
  return {
    role: (p: OverviewPerson) => t(p.role === 'specialist' ? 'common.specialist' : 'common.student'),
    status: (p: OverviewPerson) => t(`teacher.people.status.${p.status ?? 'none'}`),
  }
}

function PeopleTable({ people }: { people: OverviewPerson[] }) {
  const { t } = useTranslation()
  const label = usePersonLabels()
  return (
    <div className="tbl"><table>
      <thead><tr>{(t('teacher.people.headers', { returnObjects: true }) as string[]).map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{people.map(p => (
        <tr key={rowKey(p)}>
          <td><Who p={p} /></td><td>{p.grp || ''}</td><td>{label.role(p)}</td>
          <td>{p.case_id ?? '—'}</td><td>{p.max_step ?? '—'}</td><td>{scoreText(p)}</td>
          <td>{label.status(p)}</td><td>{p.tutor_opens || 0}</td><td><ResetPasswordButton code={p.code} /></td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}

/** На телефоне — карточки: таблица из 9 столбцов на узком экране нечитаема. */
function PeopleCards({ people }: { people: OverviewPerson[] }) {
  const { t } = useTranslation()
  const label = usePersonLabels()
  return (
    <div className="pcards">{people.map(p => (
      <div className="pcard" key={rowKey(p)}>
        <div className="spread"><b><Who p={p} />{p.grp ? <span className="muted"> · {p.grp}</span> : ''}</b><span className="tag">{label.status(p)}</span></div>
        <div className="meta">
          <span>{label.role(p)}</span>
          {p.case_id && <span>{t('teacher.people.caseStep', { id: p.case_id, n: p.max_step ?? '—' })}</span>}
          {p.score != null && <span>{t('teacher.people.points', { s: scoreText(p) })}</span>}
          <span>{t('teacher.people.toAi', { n: p.tutor_opens || 0 })}</span>
        </div>
        <div><ResetPasswordButton code={p.code} /></div>
      </div>
    ))}</div>
  )
}

export function ParticipantsTab({ overview }: { overview: OverviewState }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const phone = useIsPhone()
  const { data, error, reload } = overview
  const people = data?.people ?? []

  return (
    <>
      <div className="spread"><h1>{t('teacher.tabs.groups')}</h1><button className="btn" onClick={reload}>{t('common.refresh')}</button></div>
      <CreateGroup onCreated={reload} />
      <ImportParticipants onImported={reload} />
      <div className="row exports">
        {EXPORTS.map(k => <a key={k} className="btn" href={teacher.exportUrl(k)}>{t(`teacher.people.exports.${k}`)} · CSV</a>)}
      </div>
      {error && <Note kind="bad">{error}</Note>}
      {!people.length ? <p className="muted">{data ? t('teacher.people.empty') : t('common.loading')}</p>
        : phone ? <PeopleCards people={people} /> : <PeopleTable people={people} />}
      <p className="small muted" style={{ marginTop: 10 }}>{t('teacher.people.footer')}</p>
    </>
  )
}
