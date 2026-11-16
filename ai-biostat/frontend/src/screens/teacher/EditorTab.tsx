import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, useServices } from '@/app/ServicesContext'
import type { CaseEditRow, CaseEditVersion, Lang, ReviewStatus } from '@/api/types'
import { catalogEntry } from '@/cases/CaseRegistry'
import { useLang } from '@/core/i18n'
import { pick } from '@/core/localized'
import { editableFields, getText, type CaseTextEdits, type EditSection } from '@/domain/cases/CaseEdits'
import { Note } from '@/ui/common'

const STATUSES: ReviewStatus[] = ['draft', 'biostat', 'eduExpert', 'published']
const LANGS: [Lang, string][] = [['ru', 'Русский'], ['kk', 'Қазақша'], ['en', 'English']]
const SECTION_STEP: Record<EditSection, number | null> = { step1: 1, step2: 2, step3: 3, step5: 5, step6: 6, step7: 7, step8: 8, step9: 9, tutor: null }
const statusColor = (s: ReviewStatus) => (s === 'published' ? 'var(--ok)' : s === 'draft' ? undefined : 'var(--warn)')
const when = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toLocaleString() : '—')

/** Тексты кейса на одном языке: поля по шагам, исходный текст рядом, «вернуть исходный». */
function CaseTextEditor({ caseId, isAdmin, onSaved }: { caseId: string; isAdmin: boolean; onSaved: () => void }) {
  const { t } = useTranslation()
  const { teacher, cases, caseEdits, app } = useServices()
  const [lang, setLang] = useState<Lang>('ru')
  const original = cases.original(caseId, lang)!
  const fields = useMemo(() => editableFields(original), [original])
  const [draft, setDraft] = useState<CaseTextEdits>(() => cases.editsFor(caseId, 'ru'))
  const [saved, setSaved] = useState<CaseTextEdits>(() => cases.editsFor(caseId, 'ru'))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [history, setHistory] = useState<CaseEditVersion[] | null>(null)
  const stepNames = t('player.steps', { returnObjects: true }) as string[]
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const switchLang = (l: Lang) => {
    if (dirty && !window.confirm(t('teacher.editor.unsaved'))) return
    setLang(l); const e = cases.editsFor(caseId, l); setDraft(e); setSaved(e); setMsg(null)
  }

  const loadHistory = useCallback(() => { teacher.caseHistory(caseId).then(setHistory).catch(() => setHistory([])) }, [teacher, caseId])
  useEffect(loadHistory, [loadHistory])

  const setField = (path: string, value: string) => setDraft(d => {
    const next = { ...d }
    // пустое поле остаётся пустым, пока его правят; при сохранении пустые не отправляются (останется исходный текст)
    if (value === getText(original, path)) delete next[path]; else next[path] = value
    return next
  })

  const save = async (all: CaseTextEdits, l: Lang = lang) => {
    const texts = Object.fromEntries(Object.entries(all).filter(([, v]) => v.trim()))
    setBusy(true); setMsg(null)
    try {
      await teacher.saveCaseTexts(caseId, l, texts)
      await caseEdits.load()
      if (l === lang) { setDraft({ ...texts }); setSaved({ ...texts }) }
      setMsg({ kind: 'ok', text: t('teacher.editor.saved') }); loadHistory(); onSaved()
    } catch (e) { setMsg({ kind: 'bad', text: (e as Error).message }) }
    finally { setBusy(false) }
  }

  const sections = [...new Set(fields.map(f => f.section))]
  const changed = Object.keys(draft).length

  return (
    <>
      <div className="row" style={{ gap: 8, margin: '14px 0' }}>
        <div className="seg" role="group" aria-label={t('teacher.editor.lang')}>
          {LANGS.map(([code, label]) => <button key={code} aria-pressed={lang === code} onClick={() => switchLang(code)}>{label}</button>)}
        </div>
        <span className="small muted">{t('teacher.editor.changed', { n: changed })}</span>
        <span className="grow" style={{ flex: 1 }} />
        <button className="btn" onClick={() => app.previewCase(caseId)}>{t('teacher.editor.preview')}</button>
        {isAdmin && <button className="btn primary" disabled={!dirty || busy} onClick={() => save(draft)}>{busy ? t('common.saving') : t('common.save')}</button>}
      </div>
      {!isAdmin && <Note kind="warn">{t('teacher.editor.readOnly')}</Note>}
      <Note>{t('teacher.editor.rules')}</Note>
      {msg && <Note kind={msg.kind}>{msg.text}</Note>}

      {sections.map(sec => (
        <details key={sec} className="panel edit-section" open={sec === 'step1'}>
          <summary>{SECTION_STEP[sec] ? `${t('teacher.editor.step', { n: SECTION_STEP[sec] })} · ${stepNames[SECTION_STEP[sec]! - 1]}` : t('teacher.editor.tutorSection')}
            {fields.some(f => f.section === sec && f.path in draft) && <span className="tag" style={{ marginLeft: 8, color: 'var(--warn)' }}>{t('teacher.editor.modified')}</span>}
          </summary>
          {fields.filter(f => f.section === sec).map(f => {
            const orig = getText(original, f.path)
            const value = draft[f.path] ?? orig
            const isChanged = f.path in draft
            return (
              <div key={f.path} className="edit-field">
                <div className="spread small">
                  <label htmlFor={`f-${f.path}`}>
                    <b>{t(`teacher.editor.f.${f.kind}`, f.params)}</b>
                    {f.flag && <span className="tag" style={{ marginLeft: 6, color: f.flag === 'correct' ? 'var(--ok)' : 'var(--bad)' }}>{t(`teacher.editor.flag.${f.flag}`)}</span>}
                  </label>
                  {isChanged && isAdmin && <button className="btn ghost small" onClick={() => setField(f.path, orig)}>↺ {t('teacher.editor.restoreField')}</button>}
                </div>
                {f.multiline
                  ? <textarea id={`f-${f.path}`} className="t" value={value} readOnly={!isAdmin} style={{ minHeight: 90 }} onChange={e => setField(f.path, e.target.value)} />
                  : <input id={`f-${f.path}`} className="t" value={value} readOnly={!isAdmin} onChange={e => setField(f.path, e.target.value)} />}
                {isChanged && !value.trim() && <p className="small" style={{ color: 'var(--warn)', margin: '6px 0 0' }}>{t('teacher.editor.emptyField')}</p>}
                {isChanged && <p className="small muted orig">{t('teacher.editor.original')}: {orig}</p>}
              </div>
            )
          })}
        </details>
      ))}

      <h3 style={{ marginTop: 22 }}>{t('teacher.editor.history')}</h3>
      {!history ? <p className="muted">{t('common.loading')}</p> : !history.length ? <p className="small muted">{t('teacher.editor.noHistory')}</p> : (
        <div className="tbl"><table>
          <thead><tr><th>{t('teacher.editor.when')}</th><th>{t('teacher.editor.langCol')}</th><th>{t('teacher.editor.who')}</th><th>{t('teacher.editor.fields')}</th><th /></tr></thead>
          <tbody>{history.map((h, i) => (
            <tr key={h.id}>
              <td>{when(h.ts)}</td><td>{h.lang.toUpperCase()}</td><td>{h.author ?? '—'}</td>
              <td>{Object.keys(h.texts).length ? Object.keys(h.texts).length : t('teacher.editor.resetVersion')}</td>
              <td>{isAdmin && i > 0 && <button className="btn ghost small" disabled={busy} onClick={() => save(h.texts, h.lang)}>{t('teacher.editor.restoreVersion')}</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {isAdmin && changed > 0 && (
        <p style={{ marginTop: 12 }}><button className="btn ghost" disabled={busy} onClick={() => { if (window.confirm(t('teacher.editor.resetConfirm'))) void save({}) }}>{t('teacher.editor.resetAll')}</button></p>
      )}
    </>
  )
}

function StatusEditor({ row, isAdmin, onSaved }: { row: CaseEditRow; isAdmin: boolean; onSaved: () => void }) {
  const { t } = useTranslation()
  const { teacher } = useServices()
  const [status, setStatus] = useState<ReviewStatus>(row.status)
  const [note, setNote] = useState(row.note)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    try { await teacher.setCaseStatus(row.case_id, status, note); onSaved() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="group-form">
        <div><label className="f" htmlFor="st">{t('teacher.editor.statusLabel')}</label>
          <select id="st" className="t" value={status} disabled={!isAdmin} onChange={e => setStatus(e.target.value as ReviewStatus)}>
            {STATUSES.map(s => <option key={s} value={s}>{t(`teacher.editor.status.${s}`)}</option>)}
          </select></div>
        <div style={{ flex: '1 1 260px' }}><label className="f" htmlFor="sn">{t('teacher.editor.note')}</label>
          <input id="sn" className="t" value={note} readOnly={!isAdmin} placeholder={t('teacher.editor.notePh')} onChange={e => setNote(e.target.value)} /></div>
        {isAdmin && <button className="btn" disabled={busy || (status === row.status && note === row.note)} onClick={save}>{t('common.save')}</button>}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>{t('teacher.editor.statusHint', { who: row.status_by ?? '—', when: when(row.status_ts) })}</p>
      {error && <Note kind="bad">{error}</Note>}
    </div>
  )
}

export function EditorTab() {
  const { t } = useTranslation()
  const lang = useLang()
  const { teacher } = useServices()
  const scope = useAppState().me?.scope
  const isAdmin = scope === null || scope === undefined
  const [rows, setRows] = useState<CaseEditRow[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(() => { teacher.cases().then(setRows).catch(e => setError((e as Error).message)) }, [teacher])
  useEffect(load, [load])
  const title = (id: string) => { const e = catalogEntry(id); return e ? pick(e.title, lang) : id }
  const row = rows?.find(r => r.case_id === open)

  if (open && row) {
    return (
      <>
        <button className="btn ghost" onClick={() => { setOpen(null); load() }}>← {t('teacher.editor.backToList')}</button>
        <p className="eyebrow" style={{ marginTop: 10 }}>{t('teacher.editor.caseN', { id: open })}</p>
        <h1 className="serif">{title(open)}</h1>
        <StatusEditor key={`${row.status}|${row.note}`} row={row} isAdmin={isAdmin} onSaved={load} />
        <CaseTextEditor caseId={open} isAdmin={isAdmin} onSaved={load} />
      </>
    )
  }

  return (
    <>
      <div className="spread">
        <div><p className="eyebrow">{t('teacher.editor.eyebrow')}</p><h1 className="serif">{t('teacher.tabs.editor')}</h1></div>
        <button className="btn" onClick={load}>{t('common.refresh')}</button>
      </div>
      <p className="muted">{t('teacher.editor.intro')}</p>
      {error && <Note kind="bad">{error}</Note>}
      {!rows ? <p className="muted">{t('common.loading')}</p> : (
        <div className="tbl"><table>
          <thead><tr>{(t('teacher.editor.headers', { returnObjects: true }) as string[]).map(h => <th key={h}>{h}</th>)}<th /></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.case_id}>
              <td>{r.case_id}</td><td style={{ whiteSpace: 'normal' }}>{title(r.case_id)}</td>
              <td><span className="tag" style={{ color: statusColor(r.status) }}>{t(`teacher.editor.status.${r.status}`)}</span></td>
              <td>{r.saves ? `${r.saves} · ${when(r.last_ts)}` : '—'}</td>
              <td><button className="btn small" onClick={() => setOpen(r.case_id)}>{isAdmin ? t('teacher.editor.edit') : t('teacher.editor.view')}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>{t('teacher.editor.footer')}</p>
    </>
  )
}
