import { useTranslation } from 'react-i18next'
import { Note } from '@/ui/common'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

export function Step2Data() {
  const { t } = useTranslation()
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
      <h2>{t('step2.title')}</h2>
      <p>{t('step2.intro')}{' '}
        <span className="muted">{t('step2.shown', { n: data.preview.length, total: data.totalRows })}</span></p>
      <div className="row small" style={{ marginBottom: 10 }}>
        <span className="chip">{data.fileName}</span>
        <span className="chip">{t('step2.size', { rows: data.totalRows, cols: data.columns.length })}</span>
        <span className="chip">{t('step2.marked', { n: c.flags.length })}</span>
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
        : <Note kind="warn">{t('step2.partial', { n: c.flags.length, found })} {data.retryHint}</Note>)}
      <StepFooter canNext={c.flags.length >= 1} why={t('step2.why')} onNext={() => go(3)} />
    </>
  )
}
