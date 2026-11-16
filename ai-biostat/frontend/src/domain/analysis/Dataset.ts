/**
 * Набор данных модуля «Анализ R / Python». Файл читается и считается только в браузере —
 * на сервер ничего не отправляется (в систему нельзя загружать персональные данные).
 */
export type Row = Record<string, string>

export interface Dataset {
  name: string
  delimiter: ',' | ';' | '\t'
  columns: string[]
  rows: Row[]
}

function detectDelimiter(header: string): Dataset['delimiter'] {
  const count = (ch: string) => header.split(ch).length - 1
  const candidates: Dataset['delimiter'][] = [';', ',', '\t']
  return candidates.reduce((best, d) => (count(d) > count(best) ? d : best), ',')
}

/** Одна строка CSV с учётом кавычек ("a;b" — одно значение, "" внутри кавычек — кавычка). */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(v => v.trim())
}

export class CsvError extends Error {}

export function parseCsv(text: string, name: string): Dataset {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) throw new CsvError('empty')
  const delimiter = detectDelimiter(lines[0])
  const columns = splitLine(lines[0], delimiter).map((c, i) => c || `V${i + 1}`)
  const rows = lines.slice(1).map(line => {
    const cells = splitLine(line, delimiter)
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']))
  })
  return { name, delimiter, columns, rows }
}

export function toCsv(columns: string[], rows: Record<string, string | number>[], delimiter = ','): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return s.includes(delimiter) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(delimiter), ...rows.map(r => columns.map(c => esc(r[c] ?? '')).join(delimiter))].join('\n')
}
