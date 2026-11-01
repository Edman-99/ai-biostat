import { useTranslation } from 'react-i18next'

const BLUEPRINT: [string, number, number][] = [['biostat', 6, 6], ['data', 5, 5], ['interp', 5, 5], ['ai', 4, 4]]

export function DiagnosticsTab() {
  const { t } = useTranslation()
  return (
    <>
      <h1>{t('teacher.tabs.diag')}</h1>
      <p className="muted">{t('teacher.diagTab.intro')}</p>
      <div className="tbl"><table>
        <thead><tr><th>{t('teacher.diagTab.competence')}</th><th>{t('teacher.diagTab.variantA')}</th><th>{t('teacher.diagTab.variantB')}</th></tr></thead>
        <tbody>
          {BLUEPRINT.map(([k, a, b]) => <tr key={k}><td>{t(`blocks.${k}`)}</td><td>{a}</td><td>{b}</td></tr>)}
          <tr><td><b>{t('teacher.diagTab.total')}</b></td><td><b>20</b></td><td><b>20</b></td></tr>
        </tbody>
      </table></div>
      <p className="small muted" style={{ marginTop: 10 }}>{t('teacher.diagTab.note')}</p>
    </>
  )
}
