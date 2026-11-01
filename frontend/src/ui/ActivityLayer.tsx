import { useLayoutEffect, useRef } from 'react'
import { activities, useActivity } from './activity'

export function ActivityLayer() {
  const activity = useActivity()
  const button = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    const block = (event: Event) => {
      if (!activities.snapshot()) return
      const target = event.target
      if (target instanceof Element && target.closest('[data-activity-action]')) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const names = ['pointerdown', 'pointerup', 'pointermove', 'click', 'dblclick', 'wheel', 'touchstart', 'touchmove', 'keydown', 'keyup', 'submit', 'change', 'input']
    for (const name of names) document.addEventListener(name, block, { capture: true, passive: false })
    return () => { for (const name of names) document.removeEventListener(name, block, true) }
  }, [])
  useLayoutEffect(() => {
    if (!activity) return
    const previous = document.activeElement as HTMLElement | null
    button.current?.focus({ preventScroll: true })
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [activity])
  if (!activity) return null
  return <div className="activity-shield" role="status" aria-label="동작 진행 중">
    {activity.action && <button ref={button} data-activity-action type="button" className="secondary-button" onClick={() => activities.snapshot()?.action?.run()}>{activity.action.label}</button>}
  </div>
}
