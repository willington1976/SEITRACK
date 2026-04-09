// ─── Dashboard Jefe de Estación — Mission Control ─────────────────────────────
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useKPIsEstacion } from '@/hooks/useReportes'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras } from '@/lib/utils'
import type { Vehiculo } from '@/core/types'

// ─── Estado vehículo ──────────────────────────────────────────────────────────

const ESTADO_V: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  operativo:              { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'OPERATIVO' },
  en_mantenimiento:       { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   label: 'EN MTO.' },
  fuera_de_servicio:      { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'FUERA SERV.' },
  pendiente_verificacion: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-400',  label: 'PEND. VERIF.' },
  en_inspeccion:          { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400',    label: 'EN INSP.' },
}

const CRIT: Record<string, { dot: string; text: string; label: string }> = {
  alta:  { dot: 'bg-red-400',   text: 'text-red-400',   label: 'CRÍTICA' },
  media: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'MEDIA'   },
  baja:  { dot: 'bg-blue-400',  text: 'text-blue-400',  label: 'LEVE'    },
}

// ─── Fila de vehículo ─────────────────────────────────────────────────────────

function VehiculoRow({ v }: { v: Vehiculo }) {
  const es = ESTADO_V[v.estado] ?? ESTADO_V.operativo
  return (
    <Link to={'/vehiculos/' + v.id}
      className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-all group">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + es.bg + ' border ' + es.border}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className={es.text}>
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono font-bold text-white group-hover:text-blue-300 transition-colors">{v.matricula}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{v.modelo} · {v.anio}</p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-mono text-slate-400">{formatKm(v.kilometraje_actual)}</p>
        <p className="text-[10px] font-mono text-slate-600">{formatHoras(v.horas_motor)}</p>
      </div>
      <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 ' + es.bg + ' ' + es.border}>
        <span className={'w-1.5 h-1.5 rounded-full ' + es.dot + (v.estado === 'operativo' ? ' animate-pulse' : '')}/>
        <span className={'text-[9px] font-bold uppercase tracking-widest ' + es.text}>{es.label}</span>
      </div>
    </Link>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardEstacion() {
  const usuario    = useAuthStore(s => s.usuario)
  const estacionId = usuario?.estacion_id
  const estacion   = usuario?.estacion as any

  const { data: vehiculos, isLoading: loadingV } = useVehiculos()
  const { data: kpis,      isLoading: loadingK } = useKPIsEstacion()

  const { data: novedades } = useQuery({
    queryKey: ['novedades', 'estacion', estacionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('discrepancias')
        .select('id, descripcion, sistema_afectado, criticidad, created_at, vehiculo:vehiculos!inner(matricula, estacion_id)')
        .eq('vehiculo.estacion_id', estacionId!)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: true })
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })

  const novedadesCrit  = (novedades ?? []).filter((n: any) => n.criticidad === 'alta').length
  const novedadesMedia = (novedades ?? []).filter((n: any) => n.criticidad === 'media').length
  const novedadesTotal = novedades?.length ?? 0

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none"/>

      {/* Header */}
      <div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
          Station Control Node
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">DASHBOARD OPERATIVO</h1>
        <p className="text-slate-400 text-xs mt-1">
          {formatDate(new Date())} · {estacion?.codigo_iata} — {estacion?.aeropuerto ?? estacion?.nombre}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Unidades Operativas', v: loadingK ? '—' : (kpis?.vehiculos_operativos ?? 0) + '/' + (kpis?.vehiculos_total ?? 0), c: 'text-emerald-400' },
          { l: 'Órdenes de Trabajo',  v: loadingK ? '—' : String(kpis?.ots_abiertas ?? 0),      c: (kpis?.ots_alta_prioridad ?? 0) > 0 ? 'text-red-400' : 'text-white' },
          { l: 'Novedades Activas',   v: String(novedadesTotal), c: novedadesCrit > 0 ? 'text-red-400' : novedadesMedia > 0 ? 'text-amber-400' : novedadesTotal > 0 ? 'text-blue-400' : 'text-slate-500' },
          { l: 'Inspecciones Hoy',    v: loadingK ? '—' : String(kpis?.inspecciones_hoy ?? 0),   c: 'text-blue-400' },
        ].map(m => (
          <div key={m.l} className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className={'text-3xl font-bold font-mono ' + m.c}>{m.v}</p>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-2">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Novedades activas — solo si hay */}
      {novedadesTotal > 0 && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
                Vigilancia continua
              </p>
              <p className="text-sm font-bold text-white">Novedades Activas · {novedadesTotal}</p>
            </div>
            <div className="flex gap-2">
              {novedadesCrit > 0 && (
                <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg animate-pulse">
                  {novedadesCrit} crítica{novedadesCrit > 1 ? 's' : ''}
                </span>
              )}
              {novedadesMedia > 0 && (
                <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg">
                  {novedadesMedia} media{novedadesMedia > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {(novedades as any[]).map(n => {
              const cr = CRIT[n.criticidad] ?? CRIT.baja
              const dias = Math.floor((Date.now() - new Date(n.created_at).getTime()) / (1000*60*60*24))
              return (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <span className={'w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ' + cr.dot + (n.criticidad === 'alta' ? ' animate-pulse' : '')}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-snug">{n.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-[9px] text-blue-400 font-bold">{(n.vehiculo as any)?.matricula}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wide">{n.sistema_afectado}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-[9px] text-slate-600">{dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días'}</span>
                    </div>
                  </div>
                  <span className={'text-[9px] font-bold uppercase tracking-wide ' + cr.text}>{cr.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Flota asignada */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Estado de Flota Asignada</p>
                <p className="text-sm font-bold text-white">{vehiculos?.length ?? 0} Unidades en Red</p>
              </div>
              <Link to="/vehiculos" className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
                Acceder a Flota →
              </Link>
            </div>
            {loadingV ? (
              <div className="flex justify-center py-8"><Spinner size="sm"/></div>
            ) : !vehiculos?.length ? (
              <p className="text-slate-500 text-sm text-center py-8">Sin vehículos asignados</p>
            ) : (
              <div className="divide-y divide-white/5">
                {vehiculos.map(v => <VehiculoRow key={v.id} v={v}/>)}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Acciones rápidas */}
          <div className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Command Center Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/inspecciones',       label: 'INSPEC F0', desc: 'Cambio de turno',        color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' },
                { to: '/mantenimiento/nueva', label: 'GEN OT',   desc: 'Nueva orden de trabajo', color: 'border-slate-700 bg-white/2 text-slate-400' },
                { to: '/mantenimiento',       label: 'VER OTs',  desc: 'Órdenes activas',        color: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
                { to: '/libro-operacion',     label: 'LIBRO OP.', desc: 'Registro del turno',    color: 'border-slate-700 bg-white/2 text-slate-400' },
              ].map(a => (
                <Link key={a.label} to={a.to}
                  className={'flex flex-col gap-1 p-3 rounded-xl border transition-all hover:opacity-80 ' + a.color}>
                  <p className="text-xs font-bold uppercase tracking-widest">{a.label}</p>
                  <p className="text-[9px] text-slate-600">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Matriz de fallas — placeholder */}
          <div className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
              Matriz de Fallas
            </p>
            <p className="text-xs font-semibold text-white mb-3">Últimos 30 ciclos</p>
            {novedadesTotal === 0 ? (
              <p className="text-[10px] text-slate-600 italic text-center py-3">
                Cero fallas críticas reportadas en el período actual
              </p>
            ) : (
              <div className="space-y-2">
                {(['alta', 'media', 'baja'] as const).map(crit => {
                  const count = (novedades ?? []).filter((n: any) => n.criticidad === crit).length
                  if (!count) return null
                  const cr = CRIT[crit]
                  return (
                    <div key={crit} className="flex items-center justify-between">
                      <span className={'text-[9px] uppercase tracking-widest font-bold ' + cr.text}>{cr.label}</span>
                      <div className="flex-1 mx-3 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={'h-full rounded-full ' + cr.dot.replace('bg-', 'bg-').replace('400', '500')}
                          style={{ width: (count / novedadesTotal * 100) + '%' }}/>
                      </div>
                      <span className={'text-xs font-mono font-bold ' + cr.text}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
