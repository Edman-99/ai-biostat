import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import type { ChatMessage, TutorStatus } from '@/api/TutorApi'
import { useLang } from '@/core/i18n'
import { ApiError } from '@/core/http/HttpClient'
import { RichText } from './common'

/** Статус встроенного репетитора (включён ли, сколько сообщений осталось). null — ещё не знаем. */
export function useTutorStatus(): TutorStatus | null {
  const { tutor } = useServices()
  const [status, setStatus] = useState<TutorStatus | null>(null)
  useEffect(() => {
    let alive = true
    tutor.status().then(s => { if (alive) setStatus(s) }).catch(() => { if (alive) setStatus({ enabled: false, left: 0, limit: 0 }) })
    return () => { alive = false }
  }, [tutor])
  return status
}

/**
 * Чат с ИИ-репетитором. История хранится у вызывающего (в кейсе — progress.chat, сохраняется вместе с прогрессом).
 * Быстрые вопросы подставляются в поле ввода — студент может их изменить перед отправкой.
 */
export function TutorChat({ caseId, step, context, messages, onChange, quick, onSent, initialLeft }: {
  caseId: string | null
  step: number | null
  context: string
  messages: ChatMessage[]
  onChange: (m: ChatMessage[]) => void
  quick: string[]
  onSent?: () => void
  initialLeft: number
}) {
  const { t } = useTranslation()
  const lang = useLang()
  const { tutor } = useServices()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(initialLeft)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length, busy])

  const send = async () => {
    const q = text.trim()
    if (!q || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }]
    onChange(next); setText(''); setBusy(true); setError('')
    try {
      const r = await tutor.ask({ case_id: caseId, step, lang, context, messages: next })
      onChange([...next, { role: 'assistant', content: r.reply }])
      setLeft(r.left); onSent?.()
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      setError(status === 429 ? t('tutor.chat.limit') : status === 403 ? t('tutor.chat.blocked') : t('tutor.chat.error'))
      onChange(messages); setText(q)                  // вернуть вопрос в поле, чтобы не потерять
    } finally { setBusy(false) }
  }

  return (
    <div className="chat">
      <div className="msgs" aria-live="polite">
        {!messages.length && <div className="msg">{t('tutor.chat.welcome')}</div>}
        {messages.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'me' : ''}`}>{m.role === 'assistant' ? <RichText text={m.content} /> : m.content}</div>)}
        {busy && <div className="msg muted">{t('tutor.chat.thinking')}</div>}
        <div ref={end} />
      </div>
      {!!quick.length && !messages.length && (
        <div className="quick">
          {quick.map(q => <button key={q} onClick={() => setText(q)}>{q}</button>)}
        </div>
      )}
      {error && <p className="small" style={{ color: 'var(--bad)', margin: '0 16px 6px' }}>{error}</p>}
      <form className="ask" onSubmit={e => { e.preventDefault(); void send() }}>
        <textarea className="t" rows={2} value={text} maxLength={2000} placeholder={t('tutor.chat.placeholder')} aria-label={t('tutor.chat.placeholder')}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
        <button className="btn primary" disabled={busy || !text.trim() || left <= 0} aria-label={t('tutor.chat.send')}>↑</button>
      </form>
      <p className="small muted" style={{ margin: '0 16px 10px' }}>{t('tutor.chat.footer', { n: left })}</p>
    </div>
  )
}
