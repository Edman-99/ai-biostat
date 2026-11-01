type Listener = () => void

/** Простое наблюдаемое хранилище. React подписывается через useStore (useSyncExternalStore). */
export class Store<T> {
  private listeners = new Set<Listener>()

  constructor(private state: T) {}

  getState = (): T => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  protected setState(next: T | ((prev: T) => T)): void {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(this.state) : next
    if (Object.is(value, this.state)) return
    this.state = value
    this.listeners.forEach(l => l())
  }
}
