import { NavLink, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { Rol } from '@/core/enums'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string; label: string
  icon: React.ReactNode
  roles?: Rol[]; badge?: number
  group?: string
}

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d={d}/></svg>
)

const ICONS = {
  dashboard: "M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z",
  vehicle:   "M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3zM10 7h3.586l2 2H10V7z",
  clip:      "M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z",
  wrench:    "M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
  box:       "M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z",
  badge:     "M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
  chart:     "M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z",
  users:     "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z",
}

const ROL_LABELS: Record<string, string> = {
  jefe_nacional: 'Jefe Nacional', jefe_regional: 'Jefe Regional',
  jefe_estacion: 'Jefe de Estación', bombero: 'Bombero / Maquinista',
  odma: 'ODMA', dsna: 'DSNA',
}

export default function Sidebar() {
  const { usuario, clear } = useAuthStore()
  const { pendingCount }   = useSyncStore()
  const navigate           = useNavigate()

  if (!usuario) return null

  const NAV_ITEMS: NavItem[] = [
    { to: '/',                         label: 'Dashboard',          icon: <Ico d={ICONS.dashboard}/>, group: 'principal' },
    { to: '/vehiculos',                label: 'Flota MRE',          icon: <Ico d={ICONS.vehicle}/>,   group: 'principal' },
    { to: '/mantenimiento',            label: 'Mantenimiento',      icon: <Ico d={ICONS.wrench}/>,
      badge: pendingCount > 0 ? pendingCount : undefined,           group: 'principal' },
    { to: '/repuestos',                label: 'Repuestos',          icon: <Ico d={ICONS.box}/>,       group: 'principal' },
    { to: '/personal/certificaciones', label: 'Certificaciones',    icon: <Ico d={ICONS.badge}/>,     group: 'personal' },
    { to: '/reportes',                 label: 'Reportes / AVC',     icon: <Ico d={ICONS.chart}/>,
      roles: [Rol.JefeNacional, Rol.JefeRegional, Rol.DSNA],       group: 'reportes' },
    { to: '/admin/usuarios',           label: 'Usuarios',           icon: <Ico d={ICONS.users}/>,
      roles: [Rol.JefeNacional],                                     group: 'admin' },
    { to: '/admin/checklists',         label: 'Checklists',         icon: <Ico d={ICONS.clip}/>,
      roles: [Rol.JefeNacional],                                     group: 'admin' },
  ]

  const visible = NAV_ITEMS.filter(i =>
    !i.roles || i.roles.includes(usuario.rol as Rol)
  )

  const groups: Record<string, NavItem[]> = {}
  for (const item of visible) {
    const g = item.group ?? 'principal'
    if (!groups[g]) groups[g] = []
    groups[g].push(item)
  }

  const groupLabels: Record<string, string> = {
    principal: '',
    personal:  'Personal',
    reportes:  'Reportes',
    admin:     'Administración',
  }

  function handleLogout() {
    import('@/services/auth.service').then(({ authService }) => {
      authService.signOut().then(() => { clear(); navigate('/login') })
    })
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950/40 backdrop-blur-xl border-r border-white/5 shrink-0 relative z-50">
      {/* Glow lateral decorativo */}
      <div className="absolute right-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="white">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-widest uppercase">SEITrack</p>
          <p className="text-[10px] text-slate-500 font-mono tracking-tighter">MISSION CONTROL · v0.4</p>
        </div>
      </div>

      {/* Nav por grupos */}
      <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            {groupLabels[group] && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                {groupLabels[group]}
              </p>
            )}
            <div className="space-y-1">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all relative group',
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 font-semibold border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                >
                  <span className={cn(
                    "transition-transform duration-300 group-hover:scale-110",
                    "opacity-70 group-hover:opacity-100"
                  )}>{item.icon}</span>
                  <span className="flex-1 tracking-tight">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {/* Indicador de activo */}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario / Terminal */}
      <div className="p-4 border-t border-white/5 bg-slate-900/40">
        <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 shadow-inner">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 text-xs font-bold border border-white/10">
              {usuario.nombre_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">{usuario.nombre_completo}</p>
              <p className="text-[10px] text-slate-500 font-mono truncate uppercase tracking-tighter">
                {ROL_LABELS[usuario.rol] ?? usuario.rol}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all uppercase tracking-widest"
          >
            <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
              <path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"/>
            </svg>
            Cerrar Terminal
          </button>
        </div>
      </div>
    </aside>
  )
}
