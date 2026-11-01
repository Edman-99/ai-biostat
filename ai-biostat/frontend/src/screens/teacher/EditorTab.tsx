import { useState } from 'react'

// Макет: реальный редактор кейсов — отдельный этап (CLAUDE.md, п. 7).
const CASES_ADMIN: [number, string, string, string][] = [
  [1, 'Вспышка кори на учебной территории: оценка 7-1-7', '0.1', 'Проверка биостатистиком'],
  [4, 'Неонатальный сепсис: случай-контроль', '0.1', 'Проверка биостатистиком'],
  [21, 'ВИЧ-инфекция и занятость', '0.2', 'Опубликован'],
  [22, 'Стадия ВИЧ-инфекции и вирусная супрессия', '0.1', 'Черновик'],
  [23, 'Пропуск приёма АРТ и вирусная супрессия', '0.1', 'Проверка эксперта по мед. образованию'],
]

const statusColor = (st: string) => (st === 'Опубликован' ? 'var(--ok)' : st === 'Черновик' ? undefined : 'var(--warn)')

function NewCaseForm({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <h1>Новый кейс</h1>
      <p className="muted">Черновик сохраняется автоматически. Перед отправкой на проверку можно открыть кейс глазами студента.</p>
      <div className="panel form">
        <label className="f">Название</label><input className="t" placeholder="Например: Пропуск приёма АРТ и вирусная супрессия" />
        <div className="row">
          <div style={{ flex: 1, minWidth: 180 }}><label className="f">Уровень</label><select className="t"><option>Базовый</option><option>Сложный</option></select></div>
          <div style={{ flex: 1, minWidth: 180 }}><label className="f">Язык версии</label><select className="t"><option>Русский</option><option>Қазақша</option><option>English</option></select></div>
        </div>
        <label className="f">Ситуация (шаг 1)</label><textarea className="t" placeholder="Роль обучающегося и профессиональная задача" />
        <label className="f">Учебные данные (CSV / Excel)</label><input className="t" type="file" accept=".csv,.xlsx" />
        <p className="hint">Пометка «Учебные данные» добавляется автоматически. Реальные названия территорий и организаций не используются.</p>
        <label className="f">Словарь переменных и эталон типов (шаг 3)</label><textarea className="t" style={{ minHeight: 80 }} placeholder="переменная — описание — тип — единицы" />
        <label className="f">Ошибки в данных для шага 2</label><textarea className="t" style={{ minHeight: 70 }} />
        <label className="f">Правильный метод и дистракторы (шаг 5)</label><textarea className="t" style={{ minHeight: 70 }} />
        <label className="f">Эталонный код R и Python (шаг 6)</label><textarea className="t code" style={{ minHeight: 100 }} />
        <label className="f">Эталонный вывод и рубрика (шаг 7)</label><textarea className="t" style={{ minHeight: 80 }} />
        <label className="f">Ловушка ИИ (шаг 8)</label><textarea className="t" style={{ minHeight: 70 }} />
        <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Отмена</button><button className="btn">Предпросмотр как студент</button><button className="btn primary">Отправить на проверку</button>
        </div>
      </div>
    </>
  )
}

export function EditorTab() {
  const [editing, setEditing] = useState(false)
  if (editing) return <NewCaseForm onCancel={() => setEditing(false)} />
  return (
    <>
      <div className="spread"><h1>Редактор кейсов</h1><button className="btn primary" onClick={() => setEditing(true)}>Создать кейс</button></div>
      <p className="muted">Кейс публикуется только после проверки ключа биостатистиком и содержания — экспертом по медицинскому образованию. Решение о публикации принимает автор.</p>
      <div className="tbl"><table>
        <thead><tr><th>№</th><th>Кейс</th><th>Версия</th><th>Статус</th></tr></thead>
        <tbody>{CASES_ADMIN.map(([n, title, v, st]) => (
          <tr key={n}><td>{n}</td><td>{title}</td><td>{v}</td><td><span className="tag" style={{ color: statusColor(st) }}>{st}</span></td></tr>
        ))}</tbody>
      </table></div>
    </>
  )
}
