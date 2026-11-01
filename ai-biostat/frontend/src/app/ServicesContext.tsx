import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from '@/core/store/useStore'
import type { Services } from './container'
import type { AppState } from './AppStore'

const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const s = useContext(ServicesContext)
  if (!s) throw new Error('ServicesProvider не подключён')
  return s
}

export function useAppState(): AppState {
  return useStore(useServices().app)
}
