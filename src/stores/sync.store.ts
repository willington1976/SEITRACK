import { create } from 'zustand'

interface SyncState {
  isOnline:    boolean
  pendingCount: number
  isSyncing:   boolean
  lastSync:    Date | null
  setOnline:        (v: boolean) => void
  setPendingCount:  (n: number) => void
  setSyncing:       (v: boolean) => void
  setLastSync:      (d: Date) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline:     navigator.onLine,
  pendingCount: 0,
  isSyncing:    false,
  lastSync:     null,
  setOnline:       (isOnline)     => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setSyncing:      (isSyncing)    => set({ isSyncing }),
  setLastSync:     (lastSync)     => set({ lastSync }),
}))
