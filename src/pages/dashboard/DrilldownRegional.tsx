// ─── Vista Regional por ID — drill-down desde Dashboard Nacional ──────────────
import { useNavigate, useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { reportesService } from '@/services/reportes.service'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

interface RegionalInfo {
  id: string; nombre: string; codigo: string
}

function useRegionalInfo(id: string) {
  return useQuery({
    queryKey: ['regional', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regionales')
        .select('id, nombre, codigo')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as RegionalInfo
    },
    enabled: !!id,
  })
}

function useEstacionesRegional(regionalId: string) {
  return useQuery({
    queryKey: ['dashboard', 'regional', regionalId],
    queryFn:  () => reportesService.getRegional(regionalId),
    enabled:  !!regionalId,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  })
}

const ICAO_BADGE: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-blue-100 text-blue-700',
  D: 'bg-gray-100 text-gray-600',
}

export default function DrilldownRegional() {
  const { regionalId } = useParams<{ regionalId: string }>()
  const navigate = useNavigate()

  const { data: regional, isLoading: loadingReg } = useRegionalInfo(regionalId!)
  const { data: estaciones, isLoading: loadingEst } = useEstacionesRegional(regionalId!)

  const totales = estaciones?.reduce((acc, e) => ({
    vehiculos:  acc.vehiculos  + Number(e.total_vehiculos),
    operativos: acc.operativos + Number(e.operativos),
    en_manto:   acc.en_manto   + Number(e.en_manto),
    ots:        acc.ots        + Number(e.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, en_manto: 0, ots: 0 })

  const dispRegional = totales && totales.vehiculos > 0
    ? Math.round((totales.operativos / totales.vehiculos) * 100) : 0

  const isLoading = loadingReg || loadingEst

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/" className="hover:text-sei-600 transition-colors">Nacional</Link>
        <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
        </svg>
        <span className="text-gray-700 font-medium">
          {loadingReg ? '...' : regional?.nombre}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              {regional?.codigo && (
                <span className="text-xs font-bold bg-sei-100 text-sei-700 px-2 py-0.5 rounded">
                  {regional.codigo}
                </span>
              )}
              <h1 className="text-base font-semibold text-gray-900">
                {loadingReg ? 'Cargando...' : regional?.nombre}
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(new Date())} · {estaciones?.length ?? '—'} estaciones
            </p>
          </div>
        </div>
      </div>

      {/* KPIs regionales */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Flota MRE',        value: totales?.vehiculos ?? 0,  color: 'text-gray-900' },
            { label: 'Operativos',        value: totales?.operativos ?? 0, color: 'text-green-600' },
            { label: 'En mantenimiento',  value: totales?.en_manto ?? 0,   color: 'text-amber-600' },
            { label: 'Disponibilidad',    value: `${dispRegional}%`,
              color: dispRegional >= 80 ? 'text-green-600' : 'text-red-600' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de estaciones — clickeables */}
      <Card padding={false}>
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Estaciones de la regional</p>
          <p className="text-xs text-gray-400">Clic para ver detalle</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !estaciones?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin estaciones registradas</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {estaciones.map(e => {
              const disp = Number(e.total_vehiculos) > 0
                ? Math.round((Number(e.operativos) / Number(e.total_vehiculos)) * 100) : 0
              const tieneAlerta = Number(e.ots_abiertas) > 0 || Number(e.fuera_servicio) > 0

              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/estacion/${e.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-sei-50/50
                             transition-colors text-left group"
                >
                  {/* IATA + categoría ICAO */}
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-mono font-bold text-sm text-gray-900">{e.codigo_iata}</p>
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${
                      ICAO_BADGE[e.categoria_icao] ?? ICAO_BADGE.D
                    }`}>
                      Cat. {e.categoria_icao}
                    </span>
                  </div>

                  {/* Nombre y ciudad */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-sei-700 transition-colors">
                      {e.aeropuerto}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{e.ciudad}</p>
                  </div>

                  {/* Flota */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold text-gray-700">{e.total_vehiculos}</p>
                    <p className="text-[10px] text-gray-400">MRE</p>
                  </div>

                  {/* Estado */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Number(e.operativos) > 0 && (
                      <Badge variant="success">{e.operativos} op.</Badge>
                    )}
                    {Number(e.en_manto) > 0 && (
                      <Badge variant="warning">{e.en_manto} mto.</Badge>
                    )}
                    {Number(e.fuera_servicio) > 0 && (
                      <Badge variant="danger">{e.fuera_servicio} fs.</Badge>
                    )}
                  </div>

                  {/* Disponibilidad */}
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${
                      e.total_vehiculos === 0 ? 'text-gray-400'
                      : disp >= 80 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {e.total_vehiculos === 0 ? '—' : `${disp}%`}
                    </p>
                    {Number(e.ots_abiertas) > 0 && (
                      <span className="text-[10px] font-semibold text-red-600">
                        {e.ots_abiertas} OT
                      </span>
                    )}
                  </div>

                  {/* Última inspección */}
                  <div className="text-right shrink-0 hidden md:block">
                    <p className="text-[11px] text-gray-400">
                      {e.ultima_inspeccion
                        ? formatDate(e.ultima_inspeccion)
                        : 'Sin inspección'}
                    </p>
                    <p className="text-[10px] text-gray-300">última insp.</p>
                  </div>

                  {/* Flecha */}
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                    className="text-gray-300 group-hover:text-sei-500 shrink-0 transition-colors">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
