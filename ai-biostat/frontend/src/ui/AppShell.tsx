import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TopBar } from './TopBar'

export interface NavItem {
  key: string
  label: string
  badge?: ReactNode
}

/**
 * Каркас разделов: боковое меню слева (на телефоне — выезжает по ☰) + верхняя панель + содержимое.
 * Ничего не знает о ролях: пункты меню передаёт экран (студент/специалист — LearnerShell, преподаватель — TeacherScreen).
 */
export function AppShell({ items, current, onSelect, topExtra, children }: {
  items: NavItem[]
  current: string
  onSelect: (key: string) => void
  topExtra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const select = (key: string) => {
    setOpen(false)
    onSelect(key)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className={`shell ${open ? 'menu-open' : ''}`}>
      <aside className="side" aria-label={t('nav.label')}>
        <div className="side-brand">
          <span className="side-mark" aria-hidden="true">A<span>i</span></span>
          <span><b>AI-Biostat</b><small>{t('nav.tagline')}</small></span>
        </div>
        <nav>
          {items.map((it, i) => (
            <button key={it.key} className="side-item" aria-current={current === it.key ? 'page' : undefined}
              onClick={() => select(it.key)}>
              <span className="side-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="side-label">{it.label}</span>
              {it.badge}
            </button>
          ))}
        </nav>
        <div className="side-note"><i aria-hidden="true" /><p>{t('nav.privacy')}</p></div>
      </aside>
      <div className="side-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="shell-main">
        <TopBar onMenu={() => setOpen(o => !o)} menuOpen={open}>{topExtra}</TopBar>
        <main className="wrap page">{children}</main>
      </div>
    </div>
  )
}

/** Заголовок раздела: надзаголовок, заголовок, пояснение и место для кнопки справа. */
export function PageHead({ eyebrow, title, lead, aside }: { eyebrow: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="serif">{title}</h1>
        {lead && <p className="muted">{lead}</p>}
      </div>
      {aside}
    </div>
  )
}
