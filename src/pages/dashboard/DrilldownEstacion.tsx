import { useNavigate, useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

function useEstacionInfo(id: string) {
  return useQuery({
    queryKey: ['estacion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estaciones')
        .select('*, regional:regionales(id, nombre, codigo)')
        .eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

function useVehiculosEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['vehiculos', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, matricula, modelo, marca, anio, estado, kilometraje_actual, horas_motor')
        .eq('estacion_id', estacionId).order('matricula')
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  })
}

function useOTsEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['ots', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`id, numero_ot, tipo, estado, prioridad, descripcion,
                 fecha_programada, created_at,
                 vehiculo:vehiculos!inner(estacion_id, matricula)`)
        .eq('vehiculo.estacion_id', estacionId)
        .in('estado', ['abierta', 'en_proceso'])
        .order('prioridad').limit(10)
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  })
}

function useNovedadesEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['novedades', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discrepancias')
        .select(`
          id, descripcion, sistema_afectado, criticidad, estado, created_at,
          vehiculo:vehiculos!inner(id, matricula, modelo, estacion_id)
        `)
        .eq('vehiculo.estacion_id', estacionId)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

function useInspeccionesEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['inspecciones', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspecciones')
        .select(`id, fase, turno, resultado, liberado_servicio, fecha, created_at,
                 inspector:usuarios(nombre_completo),
                 vehiculo:vehiculos!inner(estacion_id, matricula, modelo)`)
        .eq('vehiculo.estacion_id', estacionId)
        .order('created_at', { ascending: false }).limit(8)
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60,
  })
}

const ESTADO_V: Record<string, { bg: string; text: string; border: string; label: string }> = {
  operativo:        { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'OPERATIVO' },
  en_mantenimiento: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   label: 'EN MTO.' },
  fuera_servicio:   { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'GROUNDED' },
  inspeccion:       { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    label: 'INSPECC.' },
}

const RESULTADO_STYLE: Record<string, string> = {
  aprobado:      'text-emerald-400',
  observaciones: 'text-amber-400',
  rechazado:     'text-red-400',
}

const PRIORIDAD_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  alta:  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
  media: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  baja:  { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
}

const OACI_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/30' },
  B: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  C: { bg: 'bg-blue-500/10',  text: 'text-blue-400',  border: 'border-blue-500/30' },
  D: { bg: 'bg-slate-700/30', text: 'text-slate-400', border: 'border-white/10' },
}

export default function DrilldownEstacion() {
  const { estacionId } = useParams<{ estacionId: string }>()
  const navigate = useNavigate()

  const { data: estacion, isLoading: loadingEst }  = useEstacionInfo(estacionId!)
  const { data: vehiculos, isLoading: loadingV }   = useVehiculosEstacion(estacionId!)
  const { data: ots,       isLoading: loadingOT }  = useOTsEstacion(estacionId!)
  const { data: insp,      isLoading: loadingInsp } = useInspeccionesEstacion(estacionId!)
  const { data: novedades, isLoading: loadingNov  } = useNovedadesEstacion(estacionId!)

  const novedadesCriticas = novedades?.filter(n => n.criticidad === 'alta').length ?? 0
  const novedadesMedia    = novedades?.filter(n => n.criticidad === 'media').length ?? 0
  const novedadesTotal    = novedades?.length ?? 0

  const regional  = estacion?.regional as { id: string; nombre: string; codigo: string } | null
  const operativos = vehiculos?.filter(v => v.estado === 'operativo').length ?? 0
  const total      = vehiculos?.length ?? 0
  const disp       = total > 0 ? Math.round((operativos / total) * 100) : 0
  const dispColor  = disp >= 80 ? 'text-emerald-400' : disp >= 50 ? 'text-amber-400' : 'text-red-400'
  const oaci       = OACI_STYLE[estacion?.categoria_oaci ?? estacion?.categoria_icao] ?? OACI_STYLE.D

  if (loadingEst) return <div className="flex justify-center py-20"><Spinner size="lg"/></div>
  if (!estacion)  return (
    <div className="text-center py-20">
      <p className="text-slate-500 text-sm">Estación no encontrada</p>
      <button onClick={() => navigate(-1)}
        className="mt-3 text-blue-400 text-sm hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="relative space-y-6 page-enter">
      {/* Iluminación */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-20 left-0 w-64 h-64 bg-emerald-500/3 blur-[100px] pointer-events-none" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest flex-wrap">
        <Link to="/" className="text-slate-500 hover:text-blue-400 transition-colors">Nacional</Link>
        <span className="text-slate-700">/</span>
        {regional && (
          <>
            <Link to={`/regional/${regional.id}`}
              className="text-slate-500 hover:text-blue-400 transition-colors">
              {regional.nombre}
            </Link>
            <span className="text-slate-700">/</span>
          </>
        )}
        <span className="text-slate-300 font-semibold">
          {estacion.codigo_iata} — {estacion.aeropuerto}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 glass-panel rounded-xl border border-white/5 hover:border-white/10 transition-all mt-1">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-slate-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Inspección de Estación
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-2xl text-white">{estacion.codigo_iata}</span>
            <h1 className="text-lg font-bold text-slate-200">{estacion.aeropuerto}</h1>
            <span className={`text-[9px] font-bold px-2 py-1 rounded border
                             uppercase tracking-widest ${oaci.bg} ${oaci.text} ${oaci.border}`}>
              OACI CAT {estacion.categoria_oaci ?? estacion.categoria_icao?.toString().replace(/cat\s*/i, "").trim()}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">
            {estacion.ciudad} · {estacion.nombre}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Flota MRE',      value: total,             color: 'text-white' },
          { label: 'Operativos',     value: operativos,        color: 'text-emerald-400' },
          { label: 'Novedades',      value: novedadesTotal,    color: novedadesCriticas > 0 ? 'text-red-400' : novedadesMedia > 0 ? 'text-amber-400' : novedadesTotal > 0 ? 'text-blue-400' : 'text-slate-500' },
          { label: 'Disponibilidad', value: disp + '%',        color: dispColor },
        ].map(m => (
          <div key={m.label} className="glass-panel rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-2">{m.label}</p>
            <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flota */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">Inventario</p>
            <p className="text-sm font-semibold text-white">Flota MRE · {total} unidades</p>
          </div>
          {loadingV ? (
            <div className="flex justify-center py-8"><Spinner size="sm"/></div>
          ) : !vehiculos?.length ? (
            <p className="text-sm text-slate-500 text-center py-8">Sin vehículos registrados</p>
          ) : (
            <div className="divide-y divide-white/5">
              {vehiculos.map(v => {
                const ev = ESTADO_V[v.estado] ?? ESTADO_V.operativo
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm text-white">{v.matricula}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                        {v.modelo} · {v.anio}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      <p>{v.kilometraje_actual?.toLocaleString('es-CO')} km</p>
                      <p>{v.horas_motor?.toLocaleString('es-CO')} h</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                                     uppercase tracking-wide ${ev.bg} ${ev.text} ${ev.border}`}>
                      {ev.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* OTs */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">Alertas activas</p>
            <p className="text-sm font-semibold text-white">
              Órdenes de Trabajo · {ots?.length ?? 0} abiertas
            </p>
          </div>
          {loadingOT ? (
            <div className="flex justify-center py-8"><Spinner size="sm"/></div>
          ) : !ots?.length ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20
                              flex items-center justify-center">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" className="text-emerald-400">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
                </svg>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Sistema nominal</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {ots.map((ot: any) => {
                const ps = PRIORIDAD_STYLE[ot.prioridad] ?? PRIORIDAD_STYLE.baja
                return (
                  <div key={ot.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[10px] font-mono text-slate-500">{ot.numero_ot || '—'}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border
                                       uppercase tracking-wide ${ps.bg} ${ps.text} ${ps.border}`}>
                        {ot.prioridad}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 truncate">{ot.descripcion}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                      {ot.vehiculo?.matricula} · {ot.tipo}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Novedades activas */}
      {novedadesTotal > 0 && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
                Vigilancia continua
              </p>
              <p className="text-sm font-semibold text-white">
                Novedades Activas · {novedadesTotal}
              </p>
            </div>
            <div className="flex gap-2">
              {novedadesCriticas > 0 && (
                <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                 border border-red-500/20 px-2 py-1 rounded-lg animate-pulse">
                  {novedadesCriticas} crítica{novedadesCriticas > 1 ? 's' : ''}
                </span>
              )}
              {novedadesMedia > 0 && (
                <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400
                                 border border-amber-500/20 px-2 py-1 rounded-lg">
                  {novedadesMedia} media{novedadesMedia > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {loadingNov ? (
            <div className="flex justify-center py-6"><Spinner size="sm"/></div>
          ) : (
            <div className="divide-y divide-white/5">
              {(novedades as any[]).map(n => {
                const CRIT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
                  alta:  { dot: 'bg-red-400',   text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   label: 'CRÍTICA' },
                  media: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'MEDIA'   },
                  baja:  { dot: 'bg-blue-400',  text: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  label: 'LEVE'    },
                }
                const cr = CRIT[n.criticidad] ?? CRIT.baja
                const dias = Math.floor((Date.now() - new Date(n.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                    <span className={'w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ' + cr.dot + (n.criticidad === 'alta' ? ' animate-pulse' : '')}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 leading-snug">{n.descripcion}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[9px] text-blue-400">{(n.vehiculo as any)?.matricula}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wide">{n.sistema_afectado}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[9px] text-slate-600">{dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días'}</span>
                      </div>
                    </div>
                    <span className={'text-[9px] font-bold px-2 py-1 rounded-lg border shrink-0 uppercase tracking-wide ' + cr.bg + ' ' + cr.text + ' ' + cr.border}>
                      {cr.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Inspecciones */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/5">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
            Registro de actividad
          </p>
          <p className="text-sm font-semibold text-white">
            Últimas Inspecciones · {insp?.length ?? 0} registros
          </p>
        </div>
        {loadingInsp ? (
          <div className="flex justify-center py-8"><Spinner size="sm"/></div>
        ) : !insp?.length ? (
          <p className="text-sm text-slate-500 text-center py-8">Sin inspecciones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-white/5">
                <tr>
                  {['Fecha','Vehículo','Fase','Resultado','Inspector'].map(h => (
                    <th key={h}
                      className="text-left px-4 py-3 text-[9px] font-semibold tracking-widest
                                 uppercase text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(insp as any[]).map(i => (
                  <tr key={i.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                      {formatDate(i.fecha)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white text-[11px]">
                      {i.vehiculo?.matricula}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10
                                       border border-blue-500/20 px-2 py-0.5 rounded
                                       uppercase tracking-widest">
                        {i.fase}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-[10px] uppercase tracking-wide ${RESULTADO_STYLE[i.resultado] ?? 'text-slate-400'}`}>
                        {i.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[10px]">
                      {i.inspector?.nombre_completo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
