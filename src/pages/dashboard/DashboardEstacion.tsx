import { Link } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useKPIsEstacion, useFallasPorSistema } from '@/hooks/useReportes'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras, cn } from '@/lib/utils'
import type { Vehiculo } from '@/core/types'
import { EstadoVehiculo } from '@/core/enums'

const estadoBadge: Record<EstadoVehiculo, { variant: 'success'|'warning'|'danger'|'info'; label: string; dot: string }> = {
  [EstadoVehiculo.Operativo]:        { variant: 'success', label: 'OPERATIVO', dot: 'bg-emerald-500' },
  [EstadoVehiculo.EnMantenimiento]:  { variant: 'warning', label: 'EN MTO',     dot: 'bg-amber-500' },
  [EstadoVehiculo.FueraDeServicio]:  { variant: 'danger',  label: 'FUERA SERV', dot: 'bg-red-500' },
  [EstadoVehiculo.Inspeccion]:       { variant: 'info',    label: 'INSPEC',    dot: 'bg-blue-500' },
}

function VehiculoRow({ v }: { v: Vehiculo }) {
  const b = estadoBadge[v.estado as EstadoVehiculo] ?? { variant: 'muted' as const, label: v.estado, dot: 'bg-slate-500' }
  return (
    <Link
      to={`/vehiculos/${v.id}`}
      className="flex items-center gap-4 py-3.5 px-4 hover:bg-white/5 border-b border-white/[0.03] transition-all group first:rounded-t-2xl last:rounded-b-2xl last:border-0"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-blue-500/30 transition-colors">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-slate-500 group-hover:text-blue-400 transition-colors">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/>
          <circle cx="7" cy="14" r="1.5"/><circle cx="17" cy="14" r="1.5"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-100 font-mono tracking-tight group-hover:text-blue-400 transition-colors">{v.matricula}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{v.modelo} · {v.anio}</p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-xs font-mono text-slate-300">{formatKm(v.kilometraje_actual)}</p>
        <p className="text-[10px] font-mono text-slate-500">{formatHoras(v.horas_motor)}</p>
      </div>
      <div className="flex items-center gap-3 w-32 justify-end">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", b.dot)} />
        <Badge variant={b.variant} className="bg-slate-950/50 border-white/5 font-bold text-[9px] tracking-widest">{b.label}</Badge>
      </div>
    </Link>
  )
}

function BarraFallas({ sistema, total, maximo }: { sistema: string; total: number; maximo: number }) {
  const pct = maximo > 0 ? Math.round((total / maximo) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-slate-400">{sistema}</span>
        <span className="text-slate-200 font-mono">{total} FALLAS</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardEstacion() {
  const usuario = useAuthStore(s => s.usuario)
  const { data: vehiculos, isLoading: loadingV } = useVehiculos()
  const { data: kpis,      isLoading: loadingK } = useKPIsEstacion()
  const { data: fallas,    isLoading: loadingF } = useFallasPorSistema(usuario?.estacion_id)

  const maxFallas = fallas?.[0]?.total_fallas ?? 1

  return (
    <div className="space-y-8 page-enter">
      {/* Header Estilo Cockpit */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-3 bg-blue-600 rounded-full" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Station Control Node</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            Dashboard Operativo
          </h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.2em] mt-1 space-x-3">
            <span>{formatDate(new Date())}</span>
            <span className="text-blue-500/50">·</span>
            <span>{(usuario?.estacion as { aeropuerto?: string } | undefined)?.aeropuerto ?? 'ESTACIÓN'}</span>
          </p>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label:  'UNIDADES OPERATIVAS',
            value:  loadingK ? '—' : `${kpis?.vehiculos_operativos ?? 0}/${kpis?.vehiculos_total ?? 0}`,
            color:  'text-emerald-400', bar: 'bg-emerald-600'
          },
          {
            label:  'ÓRDENES DE TRABAJO',
            value:  loadingK ? '—' : String(kpis?.ots_abiertas ?? 0),
            color:  (kpis?.ots_alta_prioridad ?? 0) > 0 ? 'text-red-500' : 'text-slate-100',
            bar:    (kpis?.ots_alta_prioridad ?? 0) > 0 ? 'bg-red-600' : 'bg-slate-700'
          },
          {
            label:  'INSPECCIONES HOY',
            value:  loadingK ? '—' : String(kpis?.inspecciones_hoy ?? 0),
            color:  'text-blue-400', bar: 'bg-blue-600'
          },
          {
            label:  'ALERTAS DE STOCK',
            value:  loadingK ? '—' : String(kpis?.stock_bajo ?? 0),
            color:  (kpis?.stock_bajo ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400',
            bar:    (kpis?.stock_bajo ?? 0) > 0 ? 'bg-amber-600' : 'bg-slate-800'
          },
        ].map(m => (
          <div key={m.label} className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", m.bar)} />
            <p className={cn("text-2xl font-bold font-mono tracking-tighter", m.color)}>{m.value}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registro de Flota */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">Estado de Flota Asignada</p>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{vehiculos ? `${vehiculos.length} UNIDADES EN RED` : 'SINCRONIZANDO...'}</p>
              </div>
              <Link to="/vehiculos" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">ACCEDER A FLOTA →</Link>
            </div>
            
            {loadingV ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Spinner size="sm" />
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Indexando Unidades...</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {vehiculos?.map(v => <VehiculoRow key={v.id} v={v} />)}
                {!vehiculos?.length && (
                  <p className="text-xs font-bold text-slate-600 text-center py-12 uppercase tracking-[.2em]">Sin vehículos asignados a este nodo</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel de Inteligencia / Acciones */}
        <div className="space-y-6">
          {/* Matriz de Fallas */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Matriz de Fallas</p>
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Últimos 30 Ciclos</p>
            </div>
            
            {loadingF ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : !fallas?.length ? (
              <p className="text-[10px] font-bold text-slate-700 text-center py-4 uppercase tracking-widest italic leading-relaxed border border-dashed border-white/5 rounded-xl">Cero fallas críticas reportadas en el periodo actual</p>
            ) : (
              <div className="space-y-4">
                {fallas.slice(0, 5).map(f => (
                  <BarraFallas
                    key={f.sistema}
                    sistema={f.sistema}
                    total={Number(f.total_fallas)}
                    maximo={Number(maxFallas)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Acciones de Combate */}
          <div className="glass-panel rounded-2xl p-6">
             <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Command Center Shortcuts</p>
             <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/vehiculos',        label: 'INSPEC F0', desc: 'DIARIA', color: 'hover:border-blue-500/50' },
                { to: '/mantenimiento/nueva', label: 'GEN OT',   desc: 'MANTO',  color: 'hover:border-red-500/50' },
                { to: '/mantenimiento',    label: 'PLANNER',   desc: 'JOBS',   color: 'hover:border-amber-500/50' },
                { to: '/repuestos',        label: 'STOCK',     desc: 'INV',    color: 'hover:border-emerald-500/50' },
              ].map(a => (
                <Link
                  key={a.label}
                  to={a.to}
                  className={cn(
                    "bg-slate-950/50 border border-white/5 rounded-xl p-3 px-4 transition-all group",
                    a.color
                  )}
                >
                  <p className="text-[11px] font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{a.label}</p>
                  <p className="text-[8px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
