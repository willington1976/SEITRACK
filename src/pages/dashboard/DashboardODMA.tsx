// ─── Dashboard ODMA — Organización de Mantenimiento Aprobada ─────────────────
// Vista centralizada de hallazgos, OTs asignadas y vehículos críticos
// La ODMA usa este dashboard para programar sus intervenciones

import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

// ─── Hooks de datos ───────────────────────────────────────────────────────────

function useOTsAsignadas(usuarioId: string) {
  return useQuery({
    queryKey: ['odma', 'ots', usuarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          id, numero_ot, tipo, estado, prioridad, descripcion,
          fecha_programada, created_at,
          vehiculo:vehiculos!inner(
            id, matricula, modelo, estado,
            estacion:estaciones(nombre, codigo_iata, ciudad)
          )
        `)
        .in('estado', ['abierta', 'en_proceso'])
        .order('prioridad', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

function useDiscrepanciasActivas(estacionId: string | null) {
  return useQuery({
    queryKey: ['odma', 'discrepancias', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discrepancias')
        .select(`
          id, descripcion, sistema_afectado, criticidad, estado, created_at,
          vehiculo:vehiculos!inner(
            id, matricula, modelo,
            estacion:estaciones(nombre, codigo_iata)
          )
        `)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60,
  })
}

function useVehiculosCriticos(estacionId: string | null) {
  return useQuery({
    queryKey: ['odma', 'vehiculos-criticos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`
          id, matricula, modelo, estado, kilometraje_actual, horas_motor,
          estacion:estaciones(nombre, codigo_iata, ciudad)
        `)
        .in('estado', ['fuera_de_servicio', 'en_mantenimiento'])
        .order('estado')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60,
  })
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const PRIORIDAD = {
  alta:  { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/20',   bar: 'bg-red-500',   label: 'ALTA' },
  media: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500', label: 'MEDIA' },
  baja:  { bg: 'bg-slate-700/20', text: 'text-slate-400', border: 'border-white/10',     bar: 'bg-slate-500', label: 'BAJA' },
}

const CRITICIDAD = {
  alta:  { dot: 'bg-red-400',    text: 'text-red-400',    label: 'CRÍTICA' },
  media: { dot: 'bg-amber-400',  text: 'text-amber-400',  label: 'MEDIA' },
  baja:  { dot: 'bg-blue-400',   text: 'text-blue-400',   label: 'BAJA' },
}

const ESTADO_V = {
  fuera_de_servicio:  { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/20',   label: 'GROUNDED' },
  en_mantenimiento:   { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'EN MTO.' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardODMA() {
  const navigate  = useNavigate()
  const usuario   = useAuthStore(s => s.usuario)
  const estacionId = usuario?.estacion_id ?? null

  const { data: ots,          isLoading: loadingOT }  = useOTsAsignadas(usuario?.id ?? '')
  const { data: discrepancias,isLoading: loadingDisc } = useDiscrepanciasActivas(estacionId)
  const { data: vehiculosCrit,isLoading: loadingV }   = useVehiculosCriticos(estacionId)

  // Agrupar OTs por estación
  const otsPorEstacion = (ots ?? []).reduce((acc, ot) => {
    const iata = (ot.vehiculo as any)?.estacion?.codigo_iata ?? 'SIN ESTACIÓN'
    if (!acc[iata]) acc[iata] = {
      nombre: (ot.vehiculo as any)?.estacion?.nombre ?? '',
      ciudad: (ot.vehiculo as any)?.estacion?.ciudad ?? '',
      ots: []
    }
    acc[iata].ots.push(ot)
    return acc
  }, {} as Record<string, { nombre: string; ciudad: string; ots: typeof ots }>)

  const totalOTs    = ots?.length ?? 0
  const otsCriticas = ots?.filter(o => o.prioridad === 'alta').length ?? 0
  const totalDisc   = discrepancias?.length ?? 0
  const discCriticas = discrepancias?.filter((d: any) => d.criticidad === 'alta').length ?? 0

  return (
    <div className="relative space-y-6">
      {/* Iluminación */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/3 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-purple-400/70 mb-1">
          ODMA · Organización de Mantenimiento Aprobada
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          CENTRO DE CONTROL TÉCNICO
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          {formatDate(new Date())} · {usuario?.nombre_completo}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'OTs Abiertas',     v: totalOTs,       c: totalOTs > 0 ? 'text-amber-400' : 'text-slate-500' },
          { l: 'Prioridad Alta',   v: otsCriticas,    c: otsCriticas > 0 ? 'text-red-400' : 'text-slate-500' },
          { l: 'Hallazgos Act.',   v: totalDisc,      c: totalDisc > 0 ? 'text-amber-400' : 'text-slate-500' },
          { l: 'Fallas Críticas',  v: discCriticas,   c: discCriticas > 0 ? 'text-red-400' : 'text-slate-500' },
        ].map(m => (
          <div key={m.l} className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className={`text-3xl font-bold font-mono ${m.c}`}>{m.v}</p>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-2">{m.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ─── OTs pendientes por estación ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
                Órdenes de Trabajo Asignadas
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                Programación de intervenciones
              </p>
            </div>
            <button
              onClick={() => navigate('/mantenimiento')}
              className="text-[9px] text-blue-400 hover:text-blue-300 uppercase
                         tracking-widest font-semibold transition-colors">
              Ver todas →
            </button>
          </div>

          {loadingOT ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !totalOTs ? (
            <div className="glass-panel rounded-2xl border border-white/5 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20
                              flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" className="text-emerald-400">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
                </svg>
              </div>
              <p className="text-slate-400 text-sm uppercase tracking-widest">Sin OTs pendientes</p>
              <p className="text-slate-600 text-xs mt-1">Todas las intervenciones están al día</p>
            </div>
          ) : (
            Object.entries(otsPorEstacion).map(([iata, grupo]) => (
              <div key={iata} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">

                {/* Header estación */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/2">
                  <span className="font-mono font-bold text-base text-blue-300">{iata}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{grupo.nombre}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{grupo.ciudad}</p>
                  </div>
                  <span className="ml-auto text-[9px] font-mono bg-amber-500/10 text-amber-400
                                   border border-amber-500/20 px-2 py-0.5 rounded">
                    {grupo.ots.length} OT{grupo.ots.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Lista de OTs */}
                <div className="divide-y divide-white/5">
                  {grupo.ots.map((ot: any) => {
                    const p = PRIORIDAD[ot.prioridad as keyof typeof PRIORIDAD] ?? PRIORIDAD.baja
                    return (
                      <div key={ot.id}
                        onClick={() => navigate(`/mantenimiento/${ot.id}`)}
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/2
                                   transition-all cursor-pointer group">

                        {/* Barra prioridad */}
                        <div className={`w-0.5 h-full min-h-8 rounded-full ${p.bar} shrink-0 mt-0.5`} />

                        <div className="flex-1 min-w-0">
                          {/* Número OT + tipo */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-slate-500">
                              {ot.numero_ot || '—'}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border
                                           uppercase tracking-wide ${p.bg} ${p.text} ${p.border}`}>
                              {p.label}
                            </span>
                            <span className="text-[9px] text-blue-400/70 uppercase tracking-wider">
                              {ot.tipo}
                            </span>
                          </div>

                          {/* Descripción */}
                          <p className="text-sm text-slate-200 group-hover:text-white
                                       transition-colors truncate uppercase tracking-wide text-xs font-semibold">
                            {ot.descripcion}
                          </p>

                          {/* Vehículo + fecha */}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-mono text-slate-500">
                              {(ot.vehiculo as any)?.matricula}
                            </span>
                            {ot.fecha_programada && (
                              <>
                                <span className="text-slate-700">·</span>
                                <span className="text-[10px] text-slate-500">
                                  ETA: {formatDate(ot.fecha_programada)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Acceder */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide
                                           ${ot.estado === 'en_proceso'
                                             ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                             : 'bg-slate-700/20 text-slate-400 border-white/10'
                                           }`}>
                            {ot.estado === 'en_proceso' ? 'EN PROCESO' : 'ABIERTA'}
                          </span>
                          <span className="text-[9px] text-slate-600 group-hover:text-blue-400
                                         uppercase tracking-wider transition-colors">
                            ACCEDER →
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── Panel derecho ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Vehículos críticos */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/5">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
                Atención inmediata
              </p>
              <p className="text-xs font-bold text-white">
                MRE Fuera de Servicio / En Mto.
              </p>
            </div>

            {loadingV ? (
              <div className="flex justify-center py-6"><Spinner size="sm"/></div>
            ) : !vehiculosCrit?.length ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Flota nominal
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {vehiculosCrit.map((v: any) => {
                  const es = ESTADO_V[v.estado as keyof typeof ESTADO_V]
                  const estacion = v.estacion
                  return (
                    <div key={v.id}
                      onClick={() => navigate(`/vehiculos/${v.id}`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/2
                                 transition-all cursor-pointer group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-white
                                         group-hover:text-blue-300 transition-colors">
                            {v.matricula}
                          </span>
                          <span className="text-[10px] font-mono text-blue-400">
                            {estacion?.codigo_iata}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                          {v.modelo}
                        </p>
                      </div>
                      {es && (
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                                         uppercase tracking-wide shrink-0
                                         ${es.bg} ${es.text} ${es.border}`}>
                          {es.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Hallazgos/Discrepancias activas */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/5">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
                Registro de hallazgos
              </p>
              <p className="text-xs font-bold text-white">
                Discrepancias Activas · {totalDisc}
              </p>
            </div>

            {loadingDisc ? (
              <div className="flex justify-center py-6"><Spinner size="sm"/></div>
            ) : !discrepancias?.length ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Sin discrepancias
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {(discrepancias as any[]).map(d => {
                  const cr = CRITICIDAD[d.criticidad as keyof typeof CRITICIDAD] ?? CRITICIDAD.baja
                  return (
                    <div key={d.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cr.dot}`}/>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${cr.text}`}>
                            {cr.label}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono">
                            {(d.vehiculo as any)?.matricula}
                          </span>
                        </div>
                        <span className="text-[9px] text-blue-400 font-mono shrink-0">
                          {(d.vehiculo as any)?.estacion?.codigo_iata}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{d.descripcion}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wide">
                        {d.sistema_afectado}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Acceso rápido */}
          <div className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Acceso Rápido
            </p>
            <div className="space-y-2">
              {[
                { label: 'Mis OTs asignadas',  to: '/mantenimiento',
                  desc: 'Ver y gestionar órdenes', color: 'border-amber-500/20 text-amber-400' },
                { label: 'Historial técnico',   to: '/mantenimiento',
                  desc: 'OTs cerradas anteriores', color: 'border-blue-500/20 text-blue-400' },
                { label: 'Inspecciones F1/F2/F3', to: '/inspecciones',
                  desc: 'Mantenimiento periódico', color: 'border-purple-500/20 text-purple-400' },
              ].map(a => (
                <button key={a.label}
                  onClick={() => navigate(a.to)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                             border transition-all hover:bg-white/5 text-left ${a.color}`}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide ${a.color.split(' ')[1]}`}>
                      {a.label}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{a.desc}</p>
                  </div>
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
                    className="shrink-0 opacity-40">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
