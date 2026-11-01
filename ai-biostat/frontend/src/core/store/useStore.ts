import { useSyncExternalStore } from 'react'
import type { Store } from './Store'

export function useStore<T>(store: Store<T>): T
export function useStore<T, R>(store: Store<T>, select: (state: T) => R): R
export function useStore<T, R>(store: Store<T>, select?: (state: T) => R): T | R {
  return useSyncExternalStore(store.subscribe, () => (select ? select(store.getState()) : store.getState()))
}
