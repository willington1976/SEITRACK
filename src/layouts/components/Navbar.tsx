import { useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { SyncIndicator } from '@/components/offline/SyncIndicator'
import { cn } from '@/lib/utils'

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
    <header className="flex items-center justify-between px-6 h-16 bg-slate-950/20 backdrop-blur-md border-b border-white/5 shrink-0 relative z-40">
      <div className="flex items-center gap-4">
        {/* Menú móvil */}
        <button className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" className="text-slate-400">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Localización</h2>
          <h1 className="text-sm font-bold text-white tracking-tight uppercase group flex items-center gap-2">
            {title}
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SyncIndicator />

        {/* Indicador de conexión Aeronáutico */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-500",
          isOnline
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-400 animate-pulse'
        )}>
          <div className="relative flex h-2 w-2">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isOnline ? "bg-emerald-400" : "bg-amber-400"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            )}></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
            {isOnline ? 'Tx/Rx Active' : 'Signal Lost'}
          </span>
        </div>

        {/* Estación del usuario / Nodo */}
        {usuario?.estacion && (
          <div className="hidden sm:flex flex-col items-end">
             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">IATA NODO</span>
             <span className="text-xs font-mono font-bold text-blue-400">
               {(usuario.estacion as { codigo_iata: string }).codigo_iata}
             </span>
          </div>
        )}
      </div>
    </header>
  )
}
