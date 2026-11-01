import { Fragment, type ReactNode } from 'react'
import type { OverviewPerson, Dispute } from '@/api/types'
import { fullName } from '@/core/text'
import type { Grade } from '@/domain/grading/GradeScale'

export function ProgressBar({ pct, style }: { pct: number; style?: React.CSSProperties }) {
  return <div className="bar" style={style}><i style={{ width: `${pct}%` }} /></div>
}

type NoteKind = 'info' | 'ok' | 'warn' | 'bad'
export function Note({ kind = 'info', children, style }: { kind?: NoteKind; children: ReactNode; style?: React.CSSProperties }) {
  return <div className={kind === 'info' ? 'note' : `note ${kind}`} style={style}>{children}</div>
}

/** Текст из описания кейса: **жирный** → <b>. */
export function RichText({ text }: { text: string }) {
  return <>{text.split('**').map((part, i) => i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>)}</>
}

export interface Option { label: string; className?: string }
export function OptionList({ options, selected, onSelect }: {
  options: Option[]; selected: number | null | undefined; onSelect: (i: number) => void
}) {
  return (
    <div className="opts" role="radiogroup">
      {options.map((o, i) => (
        <button key={i} className={`opt ${o.className ?? ''}`} role="radio" aria-checked={selected === i} onClick={() => onSelect(i)}>
          <span className="dot" />{o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ titleId, children }: { titleId: string; children: ReactNode }) {
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="panel">{children}</div></div>
}

export function GradeBadge({ grade }: { grade: Grade }) {
  return <div className="grade"><span className="lt">{grade.letter}</span><span className="muted">{grade.label}</span></div>
}

/** Участник для преподавателя: «Фамилия Имя КОД» или просто код. */
export function Who({ p }: { p: Pick<OverviewPerson | Dispute, 'code' | 'first_name' | 'last_name'> }) {
  const name = fullName(p)
  return name ? <>{name} <span className="muted small">{p.code}</span></> : <>{p.code}</>
}
