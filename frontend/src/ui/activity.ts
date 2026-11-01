import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { ActivityStore, type ActivityAction } from './activityStore.ts'

export const activities = new ActivityStore()
export const useActivity = () => useSyncExternalStore(activities.subscribe, activities.snapshot)

export function useOperation() {
  const release = useRef<(() => void) | null>(null)
  const end = useCallback(() => { release.current?.(); release.current = null }, [])
  useEffect(() => end, [end])
  const begin = useCallback((action: ActivityAction | null = null) => {
    const previous = release.current
    const done = activities.begin(action)
    release.current = done
    previous?.()
    return () => { done(); if (release.current === done) release.current = null }
  }, [])
  return { begin, end }
}

