import { useEffect } from 'react'
import { useSyncStore } from '@/stores/sync.store'
import { flushQueue, getPendingCount } from '@/db/sync-queue'

export function useSync() {
  const { setOnline, setPendingCount, setSyncing, setLastSync } = useSyncStore()

  async function triggerSync() {
    setSyncing(true)
    try {
      await flushQueue()
      setPendingCount(await getPendingCount())
      setLastSync(new Date())
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const online  = () => { setOnline(true); triggerSync() }
    const offline = () => setOnline(false)
    
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)
    
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  useEffect(() => {
    const tick = async () => setPendingCount(await getPendingCount())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return { triggerSync }
}
