import { useSyncStore } from '@/stores/sync.store'

export function SyncIndicator() {
  const { isSyncing, pendingCount, lastSync } = useSyncStore()

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-sei-600 bg-sei-50 px-2 py-1 rounded-full">
        <svg className="animate-spin" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.3"/>
          <path d="M8 2a6 6 0 016 6" strokeLinecap="round"/>
        </svg>
        Sincronizando
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4a.75.75 0 00-1.5 0v3.5c0 .414.336.75.75.75h2.5a.75.75 0 000-1.5H8.75V5z"/>
        </svg>
        {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
      </div>
    )
  }

  if (lastSync) {
    return (
      <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
        <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
        </svg>
        Sincronizado
      </div>
    )
  }

  return null
}
