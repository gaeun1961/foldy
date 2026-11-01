export type ActivityAction = { label: '취소' | '건너뛰기' | '멈추기'; run: () => void }
export class ActivityStore {
  private entries = new Map<symbol, ActivityAction | null>()
  private listeners = new Set<() => void>()
  private value: { action: ActivityAction | null } | null = null
  snapshot = () => this.value
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private publish() {
    const values = [...this.entries.values()]
    this.value = values.length ? { action: values[values.length - 1] } : null
    this.listeners.forEach(fn => fn())
  }
  begin(action: ActivityAction | null = null) {
    const token = Symbol()
    this.entries.set(token, action)
    this.publish()
    return () => { if (this.entries.delete(token)) this.publish() }
  }
}
