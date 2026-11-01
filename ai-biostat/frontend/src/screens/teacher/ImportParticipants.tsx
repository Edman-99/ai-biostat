import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { ImportResult } from '@/api/types'
import { Note } from '@/ui/common'
import { IssuedPasswords } from './IssuedPasswords'

/** Запасной способ: готовый список из CSV (code;role;group;lang). Основной — «Создать группу». */
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

  return (
    <details className="panel csv-import" style={{ marginBottom: 18 }}>
      <summary>{t('teacher.group.orCsv')}</summary>
      <p className="small muted" style={{ margin: '10px 0 8px' }}>{t('teacher.import.help')}</p>
      <div className="row">
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
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
          <IssuedPasswords issued={result.added} />
        </>
      )}
    </details>
  )
}
