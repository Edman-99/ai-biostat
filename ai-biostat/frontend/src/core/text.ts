export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0)

export const fullName = (p?: { first_name?: string | null; last_name?: string | null } | null): string =>
  p ? [p.last_name, p.first_name].filter(Boolean).join(' ') : ''
