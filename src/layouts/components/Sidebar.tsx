import { NavLink, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { Rol } from '@/core/enums'

// ─── Iconos SVG inline ────────────────────────────────────────────────────────

const Icon = ({ path, path2 }: { path: string; path2?: string }) => (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
    <path d={path}/>
    {path2 && <path d={path2}/>}
  </svg>
)

const ICONS = {
  dashboard:    "M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z",
  vehicle:      "M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z",
  clipboard:    "M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z",
  book:         "M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z",
  wrench:       "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z",
  box:          "M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z",
  certificate:  "M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
  chart:        "M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z",
  users:        "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z",
  shield:       "M9 2l1.09 3.26L13.5 4l-2.18 2.5L12.5 10 9 8.27 5.5 10l1.18-3.5L4.5 4l3.41 1.26L9 2z",
  settings:     "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947z",
  ot:           "M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm1 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z",
  warning:      "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
}

// ─── Definición de menús por rol ──────────────────────────────────────────────

interface NavItem {
  to:      string
  label:   string
  sublabel?: string
  icon:    string
  badge?:  number
}

interface NavGroup {
  label?: string
  items:  NavItem[]
}

function getNavGroups(rol: Rol, pendingCount: number, pendingRecibo: number = 0): NavGroup[] {
  switch (rol) {

    // ── BOMBERO / MAQUINISTA ────────────────────────────────────────────────
    case Rol.Bombero:
      return [
        {
          items: [
            { to: '/',                     label: 'Mi Turno',           sublabel: 'Estado del turno actual',  icon: ICONS.dashboard },
            { to: '/inspecciones',         label: 'Inspección F0',      sublabel: 'Cambio de turno diario',   icon: ICONS.clipboard },
            { to: '/libro-operacion',      label: 'Libro de Operación', sublabel: 'Registro diario del turno',icon: ICONS.book },
            ...(pendingRecibo > 0 ? [{
              to: '/inspeccion-recibo',    label: 'Verificar Recibo',   sublabel: 'ODMA completó trabajo',    icon: ICONS.wrench,
              badge: pendingRecibo
            }] : []),
          ]
        }
      ]

    // ── ODMA ────────────────────────────────────────────────────────────────
    case Rol.ODMA:
      return [
        {
          items: [
            { to: '/',              label: 'Dashboard',        sublabel: 'Centro de control técnico',   icon: ICONS.dashboard },
            { to: '/mantenimiento', label: 'Mis OTs',          sublabel: 'Órdenes asignadas',           icon: ICONS.ot,
              badge: pendingCount > 0 ? pendingCount : undefined },
            { to: '/inspecciones',  label: 'Inspecciones',     sublabel: 'F1 · F2 · F3',               icon: ICONS.clipboard },
          ]
        },
        {
          label: 'Mi Organización',
          items: [
            { to: '/personal/certificaciones', label: 'Certificaciones', sublabel: 'TME del personal ODMA', icon: ICONS.certificate },
          ]
        }
      ]

    // ── JEFE DE ESTACIÓN ────────────────────────────────────────────────────
    case Rol.JefeEstacion:
      return [
        {
          items: [
            { to: '/',              label: 'Dashboard',        sublabel: 'Estado operativo',            icon: ICONS.dashboard },
            { to: '/vehiculos',     label: 'Flota MRE',        sublabel: 'Vehículos de la estación',    icon: ICONS.vehicle },
            { to: '/inspecciones',  label: 'Inspecciones',     sublabel: 'Firmar y liberar al servicio',icon: ICONS.clipboard },
            { to: '/mantenimiento', label: 'Mantenimiento',    sublabel: 'Órdenes de trabajo',          icon: ICONS.wrench },
          ]
        }
      ]

    // ── JEFE REGIONAL ───────────────────────────────────────────────────────
    case Rol.JefeRegional:
      return [
        {
          items: [
            { to: '/',              label: 'Dashboard',        sublabel: 'Vista regional',              icon: ICONS.dashboard },
            { to: '/vehiculos',     label: 'Flota MRE',        sublabel: 'Vehículos de la regional',    icon: ICONS.vehicle },
            { to: '/mantenimiento', label: 'Mantenimiento',    sublabel: 'OTs de la regional',          icon: ICONS.wrench },
          ]
        },
        {
          label: 'Supervisión',
          items: [
            { to: '/reportes',                 label: 'Reportes / AVC',  sublabel: 'Análisis regional', icon: ICONS.chart },
            { to: '/personal/certificaciones', label: 'Certificaciones', sublabel: 'Personal regional', icon: ICONS.certificate },
          ]
        }
      ]

    // ── JEFE NACIONAL ───────────────────────────────────────────────────────
    case Rol.JefeNacional:
      return [
        {
          items: [
            { to: '/',              label: 'Centro de Mando',  sublabel: 'Vista nacional',              icon: ICONS.dashboard },
            { to: '/vehiculos',     label: 'Flota MRE',        sublabel: 'Inventario nacional',         icon: ICONS.vehicle },
            { to: '/mantenimiento', label: 'Mantenimiento',    sublabel: 'OTs activas',                 icon: ICONS.wrench },
          ]
        },
        {
          label: 'Supervisión',
          items: [
            { to: '/novedades',                 label: 'Novedades',       sublabel: 'Activas en flota',  icon: ICONS.warning },
            { to: '/reportes',                 label: 'Reportes / AVC',  sublabel: 'Cap. X · DSNA',     icon: ICONS.chart },
            { to: '/personal/certificaciones', label: 'Certificaciones', sublabel: 'Cap. VII · TME',    icon: ICONS.certificate },
          ]
        },
        {
          label: 'Administración',
          items: [
            { to: '/admin/usuarios',    label: 'Usuarios',     sublabel: 'Gestión de accesos',          icon: ICONS.users },
            { to: '/admin/checklists',  label: 'Checklists',   sublabel: 'F1 · F2 · F3',               icon: ICONS.settings },
          ]
        }
      ]

    // ── DSNA ────────────────────────────────────────────────────────────────
    case Rol.DSNA:
      return [
        {
          items: [
            { to: '/',          label: 'Dashboard',        sublabel: 'Vista nacional',                  icon: ICONS.dashboard },
            { to: '/vehiculos', label: 'Flota MRE',        sublabel: 'Solo lectura',                    icon: ICONS.vehicle },
          ]
        },
        {
          label: 'Auditoría',
          items: [
            { to: '/reportes',                 label: 'Reportes / AVC',  sublabel: 'Exportar · PDF',    icon: ICONS.chart },
            { to: '/personal/certificaciones', label: 'Certificaciones', sublabel: 'TME nacional',      icon: ICONS.certificate },
          ]
        }
      ]

    default:
      return [{ items: [{ to: '/', label: 'Dashboard', icon: ICONS.dashboard }] }]
  }
}

// ─── Labels de rol ────────────────────────────────────────────────────────────

const ROL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  jefe_nacional:  { label: 'JEFE NACIONAL',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
  jefe_regional:  { label: 'JEFE REGIONAL',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  jefe_estacion:  { label: 'JEFE ESTACIÓN',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  bombero:        { label: 'BOMBERO',          color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  odma:           { label: 'ODMA',             color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30' },
  dsna:           { label: 'DSNA',             color: 'text-slate-400',   bg: 'bg-slate-700/30 border-white/10' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Sidebar() {
  const { usuario, clear } = useAuthStore()
  const { pendingCount }   = useSyncStore()
  const navigate           = useNavigate()

  // Badge dinámico recibo pendiente — solo para Bombero
  const { data: vehiculosPendientes } = useQuery({
    queryKey: ['recibo', 'badge', usuario?.estacion_id],
    queryFn: async () => {
      if (!usuario?.estacion_id) return []
      const { data } = await supabase
        .from('vehiculos')
        .select('id')
        .eq('estado', 'pendiente_verificacion')
        .eq('estacion_id', usuario.estacion_id)
      return data ?? []
    },
    enabled: usuario?.rol === 'bombero',
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
  const reciboPendiente = vehiculosPendientes?.length ?? 0

  if (!usuario) return null

  const rol        = usuario.rol as Rol
  const rolConfig  = ROL_CONFIG[usuario.rol] ?? ROL_CONFIG.bombero
  const navGroups  = getNavGroups(rol, pendingCount, reciboPendiente)
  const initiales  = usuario.nombre_completo
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  function handleLogout() {
    import('@/services/auth.service').then(({ authService }) => {
      authService.signOut().then(() => { clear(); navigate('/login') })
    })
  }

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0
                      bg-slate-950/95 border-r border-white/5 backdrop-blur-xl">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center
                        shadow-lg shadow-blue-600/30">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="white">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-wide">SEITrack</p>
          <p className="text-[9px] text-slate-500 leading-none mt-1 uppercase tracking-widest">
            Mission Control · v0.4
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto
                      scrollbar-thin scrollbar-thumb-white/10">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest
                           px-2 mb-2">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`shrink-0 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'
                      }`}>
                        <Icon path={item.icon} />
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-none ${
                          isActive ? 'text-white' : ''
                        }`}>
                          {item.label}
                        </p>
                        {item.sublabel && (
                          <p className="text-[9px] text-slate-600 mt-0.5 leading-none truncate
                                       group-hover:text-slate-500 transition-colors">
                            {item.sublabel}
                          </p>
                        )}
                      </div>

                      {item.badge !== undefined && (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400
                                         border border-amber-500/30 px-1.5 py-0.5 rounded-full
                                         font-mono shrink-0">
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <div className="w-1 h-4 rounded-full bg-blue-400 shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="border-t border-white/5 p-3 space-y-2">
        {/* Rol badge */}
        <div className={`flex items-center justify-center px-2 py-1 rounded-lg border
                         text-[9px] font-bold uppercase tracking-widest ${rolConfig.bg} ${rolConfig.color}`}>
          {rolConfig.label}
        </div>

        {/* Info usuario */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10
                          flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate leading-none">
              {usuario.nombre_completo}
            </p>
            <p className="text-[9px] text-slate-600 truncate mt-0.5 leading-none">
              {(usuario.estacion as any)?.codigo_iata ?? '—'} ·{' '}
              {(usuario.estacion as any)?.nombre ?? '—'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
                     text-[10px] text-slate-600 hover:text-red-400
                     hover:bg-red-500/5 transition-all uppercase tracking-widest"
        >
          <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
            <path fillRule="evenodd" d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5H6.75a.75.75 0 000 1.5h5.69l-1.97 1.97a.75.75 0 101.06 1.06l3.25-3.25a.75.75 0 000-1.06l-3.25-3.25a.75.75 0 10-1.06 1.06l1.97 1.97z"/>
          </svg>
          Cerrar Terminal
        </button>
      </div>
    </aside>
  )
}
