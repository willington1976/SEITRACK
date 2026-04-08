import { Outlet } from 'react-router'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import { OfflineBanner } from '@/components/offline/OfflineBanner'
import { useSyncStore } from '@/stores/sync.store'

export default function AppLayout() {
  const isOnline = useSyncStore(s => s.isOnline)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Capa de iluminación suave decorativa */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
        
        <Navbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter p-4 md:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
