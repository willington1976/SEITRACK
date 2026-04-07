import { Outlet } from 'react-router'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import { OfflineBanner } from '@/components/offline/OfflineBanner'
import { useSyncStore } from '@/stores/sync.store'

export default function AppLayout() {
  const isOnline = useSyncStore(s => s.isOnline)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter p-4 md:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
