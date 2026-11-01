import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCaseSession } from './CaseSession'

interface Props {
  canNext: boolean
  why?: string
  label?: string
  onNext: () => void
  showBack?: boolean
}

/** Нижняя панель шага: «Назад» / «Далее» с причиной, почему «Далее» недоступна. Ctrl+Enter = «Далее». */
export function StepFooter({ canNext, why, label, onNext, showBack }: Props) {
  const { t } = useTranslation()
  const { progress, back } = useCaseSession()
  const withBack = showBack ?? (progress.step > 1 && progress.step < 9)
  const latest = useRef({ canNext, onNext })
  latest.current = { canNext, onNext }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && latest.current.canNext) latest.current.onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="foot">
      <div>{withBack && <button className="btn" onClick={back}>← {t('common.back')}</button>}</div>
      <div>
        <button className="btn primary" disabled={!canNext} onClick={onNext}>{label || t('common.next')}</button>
        {!canNext && why && <div className="why">{why}</div>}
        <div className="kbd">Ctrl+Enter</div>
      </div>
    </div>
  )
}
