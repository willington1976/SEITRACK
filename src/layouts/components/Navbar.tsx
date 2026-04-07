import { useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { SyncIndicator } from '@/components/offline/SyncIndicator'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/vehiculos': 'Flota MRE',
  '/mantenimiento': 'Mantenimiento',
  '/reportes': 'Reportes y AVC',
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { usuario } = useAuthStore()
  const { isOnline } = useSyncStore()

  const title = Object.entries(PAGE_TITLES)
    .find(([path]) => path === '/' ? pathname === '/' : pathname.startsWith(path))?.[1]
    ?? 'SEITrack'

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-14 bg-white border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-3">
        {/* Menú móvil — placeholder */}
        <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="text-gray-500">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <SyncIndicator />

        {/* Indicador de conexión */}
        <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full ${
          isOnline
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
          {isOnline ? 'En línea' : 'Sin conexión'}
        </div>

        {/* Estación del usuario */}
        {usuario?.estacion && (
          <span className="hidden sm:block text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
            {(usuario.estacion as { codigo_iata: string }).codigo_iata}
          </span>
        )}
      </div>
    </header>
  )
}
