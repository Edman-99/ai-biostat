import { useCallback, useEffect, useState } from 'react'
import { useServices } from '@/app/ServicesContext'
import type { Overview } from '@/api/types'

export interface OverviewState {
  data: Overview | null
  error: string
  reload: () => void
}

export function useOverview(): OverviewState {
  const { teacher } = useServices()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    setData(null)
    teacher.overview()
      .then(d => { if (alive) { setData(d); setError('') } })
      .catch(e => { if (alive) { setData({ people: [], disputes: [] }); setError((e as Error).message) } })
    return () => { alive = false }
  }, [teacher, version])

  return { data, error, reload: useCallback(() => setVersion(v => v + 1), []) }
}
