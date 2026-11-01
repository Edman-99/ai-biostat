import { Note } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step2Data() {
  const { def, progress: c, patch, go } = useCaseSession()
  const { data } = def
  const errorCount = Object.keys(data.errors).length
  const found = c.flags.filter(f => data.errors[f]).length

  const toggle = (id: number) => {
    if (c.locked) return
    patch({ flags: c.flags.includes(id) ? c.flags.filter(x => x !== id) : [...c.flags, id] })
  }

  return (
    <>
      <h2>Шаг 2. Изучение данных</h2>
      <p>Перед анализом проверьте данные. Нажмите на строки, в которых есть ошибки.{' '}
        <span className="muted">Показаны первые {data.preview.length} строк из {data.totalRows}.</span></p>
      <div className="row small" style={{ marginBottom: 10 }}>
        <span className="chip">{data.fileName}</span>
        <span className="chip">{data.totalRows} строк · {data.columns.length} столбцов</span>
        <span className="chip">Отмечено: {c.flags.length}</span>
      </div>
      <div className="tbl"><table>
        <thead><tr>{data.columns.map(col => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>
          {data.preview.map(r => {
            const id = Number(r.id)
            return (
              <tr key={id} className={`pick ${c.flags.includes(id) ? 'flag' : ''}`} tabIndex={0}
                onClick={() => toggle(id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id) } }}>
                {data.columns.map(col => <td key={col} className={typeof r[col] === 'number' ? 'num' : undefined}>{r[col]}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table></div>
      {c.flags.length >= errorCount && (found === errorCount
        ? <Note kind="ok">{data.allFoundNote}</Note>
        : <Note kind="warn">Отмечено {c.flags.length}, из них верных — {found}. {data.retryHint}</Note>)}
      <StepFooter canNext={c.flags.length >= 1} why="Отметьте хотя бы одну строку с ошибкой" onNext={() => go(3)} />
    </>
  )
}
