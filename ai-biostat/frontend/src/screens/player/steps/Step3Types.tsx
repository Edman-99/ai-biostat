import { Fragment } from 'react'
import type { VarType } from '@/domain/cases/CaseDefinition'
import { useCaseSession } from '../CaseSession'
import { StepFooter } from '../StepFooter'

const TYPE_LABELS: Record<VarType, string> = {
  q: 'Количественная', n: 'Категориальная номинальная', o: 'Порядковая', b: 'Категориальная бинарная', id: 'Идентификатор',
}

export function Step3Types() {
  const { def, progress: c, level, patch, go } = useCaseSession()
  const ro = c.locked
  const vars = def.variables
  const done = vars.filter(v => c.types[v.key]).length

  return (
    <>
      <h2>Шаг 3. Типы переменных</h2>
      <p>Укажите тип каждой переменной и отметьте исход — то, что мы объясняем.</p>
      <div className="types">
        <span className="h">Переменная</span><span className="h">Тип</span><span className="h">Исход</span>
        {vars.map(v => (
          <Fragment key={v.key}>
            <span><code>{v.key}</code> <span className="muted small">{v.label}</span></span>
            <select className="t" disabled={ro} aria-label={`Тип: ${v.label}`} value={c.types[v.key] || ''}
              onChange={e => patch({ types: { ...c.types, [v.key]: e.target.value } })}>
              <option value="">— выберите —</option>
              {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              {level === 'post' && <option value="other">Другое (с обоснованием)</option>}
            </select>
            <label className="row small">
              <input type="radio" name="out" value={v.key} checked={c.outcome === v.key} disabled={ro}
                onChange={() => patch({ outcome: v.key })} /> исход
            </label>
          </Fragment>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Размечено {done} из {vars.length}</p>
      <StepFooter canNext={done === vars.length && !!c.outcome}
        why={`Укажите тип всех ${vars.length} переменных и отметьте исход`} onNext={() => go(4)} />
    </>
  )
}
