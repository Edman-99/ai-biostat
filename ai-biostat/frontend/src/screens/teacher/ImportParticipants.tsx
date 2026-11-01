import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import type { ImportResult } from '@/api/types'
import { downloadCsv } from '@/core/download'
import { Note } from '@/ui/common'

/** Загрузка участников из CSV (code;role;group;lang). Пароли показываются один раз — их нужно скачать. */
export function ImportParticipants({ onImported }: { onImported: () => void }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  const upload = async (file: File) => {
    setBusy(true); setError(''); setResult(null)
    try {
      const res = await teacher.importParticipants(await file.text())
      setResult(res)
      if (res.added.length) onImported()
    } catch (e) { setError((e as Error).message) }
    finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const download = () => result && downloadCsv(
    `passwords_${new Date().toISOString().slice(0, 10)}.csv`,
    ['code', 'password', 'group', 'role'],
    result.added.map(a => [a.code, a.password, a.group ?? '', a.role ?? '']))

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <h3>{t('teacher.import.title')}</h3>
      <p className="small muted" style={{ marginBottom: 8 }}>{t('teacher.import.help')}</p>
      <div className="row">
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t('teacher.import.uploading') : t('teacher.import.choose')}
        </button>
      </div>
      {error && <Note kind="bad">{error}</Note>}
      {result && (
        <>
          <Note kind={result.added.length ? 'ok' : 'warn'}>
            <b>{t('teacher.import.added', { n: result.added.length })}</b>
            {result.skipped.length > 0 && <> · {t('teacher.import.skipped', { n: result.skipped.length, codes: result.skipped.join(', ') })}</>}
          </Note>
          {result.errors.length > 0 && (
            <Note kind="warn"><b>{t('teacher.import.notAdded')}</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{result.errors.map(e => <li key={e}>{e}</li>)}</ul></Note>
          )}
          {result.added.length > 0 && (
            <>
              <Note kind="warn"><b>{t('teacher.import.passwordsOnce')}</b> {t('teacher.import.passwordsHelp')}</Note>
              <div className="row" style={{ marginBottom: 10 }}><button className="btn primary" onClick={download}>{t('teacher.import.download')}</button></div>
              <div className="tbl"><table>
                <thead><tr>{(t('teacher.import.headers', { returnObjects: true }) as string[]).map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{result.added.map(a => (
                  <tr key={a.code}><td>{a.code}</td><td className="num"><code>{a.password}</code></td><td>{a.group}</td><td>{a.role ? t(`roles.${a.role}`) : ''}</td></tr>
                ))}</tbody>
              </table></div>
            </>
          )}
        </>
      )}
    </div>
  )
}
