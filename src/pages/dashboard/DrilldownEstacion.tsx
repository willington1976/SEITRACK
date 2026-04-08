// ─── Vista Estación por ID — drill-down desde Dashboard Regional ──────────────
import { useNavigate, useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatDateTime } from '@/lib/utils'

// ─── Hooks de datos ───────────────────────────────────────────────────────────

function useEstacionInfo(id: string) {
  return useQuery({
    queryKey: ['estacion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estaciones')
        .select('*, regional:regionales(id, nombre, codigo)')
        .eq('id', id)
        .single()
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
        .eq('estacion_id', estacionId)
        .order('matricula')
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60,
  })
}

function useOTsEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['ots', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          id, numero_ot, tipo, estado, prioridad, descripcion,
          fecha_programada, created_at,
          vehiculo:vehiculos!inner(estacion_id, matricula)
        `)
        .eq('vehiculo.estacion_id', estacionId)
        .in('estado', ['abierta', 'en_proceso'])
        .order('prioridad')
        .limit(10)
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
  })
}

function useInspeccionesEstacion(estacionId: string) {
  return useQuery({
    queryKey: ['inspecciones', 'estacion', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspecciones')
        .select(`
          id, fase, turno, resultado, liberado_servicio, fecha, created_at,
          inspector:usuarios(nombre_completo),
          vehiculo:vehiculos!inner(estacion_id, matricula, modelo)
        `)
        .eq('vehiculo.estacion_id', estacionId)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60,
  })
}

// ─── Constantes visuales ──────────────────────────────────────────────────────

const ESTADO_V: Record<string, { color: string; label: string }> = {
  operativo:       { color: 'bg-green-100 text-green-700',  label: 'Operativo' },
  en_mantenimiento:{ color: 'bg-amber-100 text-amber-700',  label: 'En mto.' },
  fuera_servicio:  { color: 'bg-red-100 text-red-700',      label: 'Fuera serv.' },
  inspeccion:      { color: 'bg-blue-100 text-blue-700',    label: 'Inspección' },
}

const RESULTADO_COLOR: Record<string, string> = {
  aprobado:     'text-green-600',
  observaciones:'text-amber-600',
  rechazado:    'text-red-600',
}

const PRIORIDAD_BADGE: Record<string, 'danger'|'warning'|'muted'> = {
  alta:  'danger',
  media: 'warning',
  baja:  'muted',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DrilldownEstacion() {
  const { estacionId } = useParams<{ estacionId: string }>()
  const navigate = useNavigate()

  const { data: estacion, isLoading: loadingEst } = useEstacionInfo(estacionId!)
  const { data: vehiculos, isLoading: loadingV }  = useVehiculosEstacion(estacionId!)
  const { data: ots,       isLoading: loadingOT }  = useOTsEstacion(estacionId!)
  const { data: insp,      isLoading: loadingInsp } = useInspeccionesEstacion(estacionId!)

  const regional = estacion?.regional as { id: string; nombre: string; codigo: string } | null

  const operativos = vehiculos?.filter(v => v.estado === 'operativo').length ?? 0
  const total      = vehiculos?.length ?? 0
  const disp       = total > 0 ? Math.round((operativos / total) * 100) : 0

  if (loadingEst) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>
  if (!estacion)  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-sm">Estación no encontrada</p>
      <button onClick={() => navigate(-1)} className="mt-2 text-sei-600 text-sm hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-sei-600 transition-colors">Nacional</Link>
        <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
        </svg>
        {regional && (
          <>
            <Link to={`/regional/${regional.id}`} className="hover:text-sei-600 transition-colors">
              {regional.nombre}
            </Link>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
            </svg>
          </>
        )}
        <span className="text-gray-700 font-medium">
          {estacion.codigo_iata} — {estacion.aeropuerto}
        </span>
      </div>

      {/* Header estación */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg mt-0.5">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-lg text-gray-900">{estacion.codigo_iata}</span>
            <h1 className="text-base font-semibold text-gray-800">{estacion.aeropuerto}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              { A:'bg-red-100 text-red-700', B:'bg-amber-100 text-amber-700',
                C:'bg-blue-100 text-blue-700', D:'bg-gray-100 text-gray-600'
              }[estacion.categoria_icao] ?? 'bg-gray-100 text-gray-600'
            }`}>
              ICAO Cat. {estacion.categoria_icao}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{estacion.ciudad} · {estacion.nombre}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Flota MRE',       value: total,       color: 'text-gray-900' },
          { label: 'Operativos',      value: operativos,  color: 'text-green-600' },
          { label: 'OTs abiertas',    value: ots?.length ?? '—',
            color: (ots?.length ?? 0) > 0 ? 'text-red-600' : 'text-gray-900' },
          { label: 'Disponibilidad',  value: `${disp}%`,
            color: disp >= 80 ? 'text-green-600' : 'text-red-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flota */}
        <Card padding={false}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Flota MRE</p>
            <p className="text-xs text-gray-400">{total} vehículos</p>
          </div>
          {loadingV ? (
            <div className="flex justify-center py-6"><Spinner size="sm"/></div>
          ) : !vehiculos?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin vehículos registrados</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {vehiculos.map(v => {
                const ev = ESTADO_V[v.estado] ?? ESTADO_V.operativo
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-gray-900">{v.matricula}</p>
                      <p className="text-[11px] text-gray-400">{v.modelo} · {v.anio}</p>
                    </div>
                    <div className="text-right text-[11px] text-gray-400">
                      <p>{v.kilometraje_actual?.toLocaleString('es-CO')} km</p>
                      <p>{v.horas_motor?.toLocaleString('es-CO')} h</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${ev.color}`}>
                      {ev.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* OTs abiertas */}
        <Card padding={false}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">OTs abiertas</p>
            <p className="text-xs text-gray-400">{ots?.length ?? 0} en proceso</p>
          </div>
          {loadingOT ? (
            <div className="flex justify-center py-6"><Spinner size="sm"/></div>
          ) : !ots?.length ? (
            <div className="flex flex-col items-center py-6 gap-1">
              <svg viewBox="0 0 20 20" width="24" height="24" fill="currentColor" className="text-green-300">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
              </svg>
              <p className="text-xs text-gray-400">Sin OTs abiertas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ots.map(ot => (
                <div key={ot.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500">{(ot as any).numero_ot || '—'}</p>
                      <p className="text-sm text-gray-800 truncate mt-0.5">{ot.descripcion}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {(ot.vehiculo as any)?.matricula} · {ot.tipo}
                      </p>
                    </div>
                    <Badge variant={PRIORIDAD_BADGE[ot.prioridad] ?? 'muted'}>
                      {ot.prioridad}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Últimas inspecciones */}
      <Card padding={false}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Últimas inspecciones</p>
          <p className="text-xs text-gray-400">{insp?.length ?? 0} registros recientes</p>
        </div>
        {loadingInsp ? (
          <div className="flex justify-center py-6"><Spinner size="sm"/></div>
        ) : !insp?.length ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin inspecciones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Fecha','Vehículo','Fase','Resultado','Inspector'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {insp.map((i: any) => (
                  <tr key={i.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(i.fecha)}</td>
                    <td className="px-4 py-2.5 font-mono font-medium text-gray-900">
                      {i.vehiculo?.matricula}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 uppercase text-[10px] font-semibold">
                      {i.fase}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${RESULTADO_COLOR[i.resultado] ?? 'text-gray-600'}`}>
                        {i.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {i.inspector?.nombre_completo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
