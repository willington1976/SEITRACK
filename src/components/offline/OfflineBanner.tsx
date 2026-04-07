import { useSyncStore } from '@/stores/sync.store'

export function OfflineBanner() {
  const { pendingCount } = useSyncStore()
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="shrink-0">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span>
        Modo sin conexión — los datos se guardan localmente
        {pendingCount > 0 && ` · ${pendingCount} registro${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de sincronizar`}
      </span>
    </div>
  )
}
