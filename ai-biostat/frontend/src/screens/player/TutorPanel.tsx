import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { useCaseSession } from './CaseSession'

// «Биостатистика пәнінен ЖИ-репетиторы» — в пилоте внешний GPT, в системе считаем только переходы.
export const TUTOR_URL = 'https://chatgpt.com/g/g-6927183a0bb48191a49dda7e8525f334-biostatistika-p-ninen-zhi-repetitory'

/** Шаги, где репетитор закрыт (решение методиста): 4, 7, 8. */
const BLOCKED_STEPS = [4, 7, 8]

function CopyQuestion({ q }: { q: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { void navigator.clipboard.writeText(q) } catch { /* нет доступа к буферу */ }
    setCopied(true)
  }
  return <button className="copyq" onClick={copy}><span>{q}</span><span>{copied ? t('tutor.copied') : t('tutor.copy')}</span></button>
}

export function TutorPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { research } = useServices()
  const { def, progress, patch } = useCaseSession()
  const blocked = BLOCKED_STEPS.includes(progress.step) ? t(`tutor.blocked${progress.step}`) : ''

  const onOpenTutor = () => {
    patch(c => ({ hints: c.hints + 1 }))
    research.track('tutor_open')
  }

  return (
    <aside className={`tutor ${open ? 'open' : ''}`} aria-label={t('tutor.aside')}>
      <header>
        <div className="spread"><b>{t('tutor.title')}</b><button className="btn ghost small" id="tclose" aria-label={t('tutor.collapse')} onClick={onClose}>✕</button></div>
        <div className="chips"><span className="chip">{t('tutor.case', { id: def.id })}</span><span className="chip">{t('tutor.step', { n: progress.step })}</span><span className="chip">{def.data.fileName}</span></div>
      </header>
      {blocked ? <div className="locked-ai">{blocked}</div> : (
        <div className="ext">
          <p className="small" style={{ margin: 0 }}>{t('tutor.intro')}</p>
          <a className="btn primary" href={TUTOR_URL} target="_blank" rel="noopener" onClick={onOpenTutor}
            style={{ textAlign: 'center', textDecoration: 'none' }}>{t('tutor.open')}</a>
          <ol><li>{t('tutor.how1')}</li><li>{t('tutor.how2')}</li><li>{t('tutor.how3')}</li></ol>
          <b className="small" style={{ marginTop: 6 }}>{t('tutor.askHere')}</b>
          {(def.tutor.quick[progress.step] || [t('tutor.defaultQ')]).map(q => <CopyQuestion key={`${progress.step}-${q}`} q={q} />)}
        </div>
      )}
      <div className="small muted" style={{ padding: '10px 16px 14px', marginTop: 'auto' }}>
        {t('tutor.counter', { n: progress.hints })}
      </div>
    </aside>
  )
}
