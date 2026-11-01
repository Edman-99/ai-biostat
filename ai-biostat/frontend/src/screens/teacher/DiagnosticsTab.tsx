const BLUEPRINT: [string, number, number][] = [
  ['Биостатистика', 6, 6], ['Работа с данными', 5, 5], ['Интерпретация', 5, 5], ['Работа с ИИ', 4, 4],
]

export function DiagnosticsTab() {
  return (
    <>
      <h1>Диагностика</h1>
      <p className="muted">Два параллельных варианта по 20 заданий с одинаковой структурой: вариант А — входная, вариант Б — итоговая диагностика.</p>
      <div className="tbl"><table>
        <thead><tr><th>Компетенция</th><th>Вариант А</th><th>Вариант Б</th></tr></thead>
        <tbody>
          {BLUEPRINT.map(([k, a, b]) => <tr key={k}><td>{k}</td><td>{a}</td><td>{b}</td></tr>)}
          <tr><td><b>Всего</b></td><td><b>20</b></td><td><b>20</b></td></tr>
        </tbody>
      </table></div>
      <p className="small muted" style={{ marginTop: 10 }}>Распределение заданий по компетенциям — предварительное, утверждает автор.</p>
    </>
  )
}
