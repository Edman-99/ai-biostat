import { useTranslation } from 'react-i18next'
import type { IssuedPassword } from '@/api/types'
import { downloadCsv } from '@/core/download'
import { Note } from '@/ui/common'

/** Только что выданные пароли: таблица, файл для Excel и карточки для печати (видны только при печати). */
export function IssuedPasswords({ issued }: { issued: IssuedPassword[] }) {
  const { t } = useTranslation()
  if (!issued.length) return null

  const download = () => downloadCsv(
    `passwords_${new Date().toISOString().slice(0, 10)}.csv`,
    ['code', 'password', 'group', 'role'],
    issued.map(a => [a.code, a.password, a.group ?? '', a.role ?? '']))

  return (
    <>
      <Note kind="warn"><b>{t('teacher.import.passwordsOnce')}</b> {t('teacher.import.passwordsHelp')}</Note>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn primary" onClick={() => window.print()}>🖨 {t('teacher.issued.print')}</button>
        <button className="btn" onClick={download}>{t('teacher.import.download')}</button>
      </div>
      <div className="tbl"><table>
        <thead><tr>{(t('teacher.import.headers', { returnObjects: true }) as string[]).map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{issued.map(a => (
          <tr key={a.code}><td>{a.code}</td><td className="num"><code>{a.password}</code></td><td>{a.group}</td><td>{a.role ? t(`roles.${a.role}`) : ''}</td></tr>
        ))}</tbody>
      </table></div>

      <div className="print-area" aria-hidden="true">
        {issued.map(a => (
          <div className="print-card" key={a.code}>
            <div className="pc-brand">AI-Biostat</div>
            <div className="pc-row"><span>{t('teacher.issued.site')}</span><b>{location.host}</b></div>
            <div className="pc-row"><span>{t('teacher.issued.code')}</span><b className="pc-big">{a.code}</b></div>
            <div className="pc-row"><span>{t('teacher.issued.password')}</span><b className="pc-big">{a.password}</b></div>
            {a.group && <div className="pc-row"><span>{t('teacher.issued.group')}</span><b>{a.group}</b></div>}
            <div className="pc-note">{t('teacher.issued.cardNote')}</div>
          </div>
        ))}
      </div>
    </>
  )
}
