import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServices } from '@/app/ServicesContext'
import { useCaseSession } from './CaseSession'

// «Биостатистика пәнінен ЖИ-репетиторы» — в пилоте внешний GPT, в системе считаем только переходы.
export const TUTOR_URL = 'https://chatgpt.com/g/g-6927183a0bb48191a49dda7e8525f334-biostatistika-p-ninen-zhi-repetitory'

const BLOCKED: Record<number, string> = {
  4: 'Сначала ответьте сами — на шаге «Вопрос» репетитор не используется.',
  7: 'Вывод вы формулируете сами. Репетитор на этом шаге не используется.',
  8: 'Здесь вы проверяете ИИ, поэтому репетитор недоступен.',
}

function CopyQuestion({ q }: { q: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { void navigator.clipboard.writeText(q) } catch { /* нет доступа к буферу */ }
    setCopied(true)
  }
  return <button className="copyq" onClick={copy}><span>{q}</span><span>{copied ? 'Скопировано' : 'Копировать'}</span></button>
}

export function TutorPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { research } = useServices()
  const { def, progress, patch } = useCaseSession()
  const blocked = BLOCKED[progress.step]

  const onOpenTutor = () => {
    patch(c => ({ hints: c.hints + 1 }))
    research.track('tutor_open')
  }

  return (
    <aside className={`tutor ${open ? 'open' : ''}`} aria-label="ИИ-репетитор">
      <header>
        <div className="spread"><b>{t('tutor')}</b><button className="btn ghost small" id="tclose" aria-label="Свернуть" onClick={onClose}>✕</button></div>
        <div className="chips"><span className="chip">Кейс {def.id}</span><span className="chip">Шаг {progress.step}</span><span className="chip">{def.data.fileName}</span></div>
      </header>
      {blocked ? <div className="locked-ai">{blocked}</div> : (
        <div className="ext">
          <p className="small" style={{ margin: 0 }}>В пилоте репетитор открывается в отдельной вкладке. Ваши ответы и оценки сохраняются только здесь, в AI-Biostat.</p>
          <a className="btn primary" href={TUTOR_URL} target="_blank" rel="noopener" onClick={onOpenTutor}
            style={{ textAlign: 'center', textDecoration: 'none' }}>Открыть ИИ-репетитор ↗</a>
          <ol><li>Скопируйте вопрос ниже или задайте свой</li><li>Получите консультацию</li><li>Вернитесь на эту вкладку — шаг сохранён</li></ol>
          <b className="small" style={{ marginTop: 6 }}>О чём можно спросить на этом шаге</b>
          {(def.tutor.quick[progress.step] || ['Как подойти к этому шагу?']).map(q => <CopyQuestion key={`${progress.step}-${q}`} q={q} />)}
        </div>
      )}
      <div className="small muted" style={{ padding: '10px 16px 14px', marginTop: 'auto' }}>
        Переходов к репетитору: <span>{progress.hints}</span> · учитывается в исследовании
      </div>
    </aside>
  )
}
