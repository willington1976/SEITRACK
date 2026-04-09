import { useNavigate, useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { reportesService } from '@/services/reportes.service'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

interface RegionalInfo { id: string; nombre: string; codigo: string }

function useRegionalInfo(id: string) {
  return useQuery({
    queryKey: ['regional', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regionales').select('id, nombre, codigo').eq('id', id).single()
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

const OACI_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  B: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  C: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  D: { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
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
    <div className="relative space-y-6 page-enter">
      {/* Iluminación */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
        <Link to="/" className="text-slate-500 hover:text-blue-400 transition-colors">Nacional</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 font-semibold">
          {loadingReg ? '...' : regional?.nombre}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 glass-panel rounded-xl border border-white/5
                       hover:border-white/10 transition-all">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-slate-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
            </svg>
          </button>
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-0.5">
              Vista Regional
            </p>
            <div className="flex items-center gap-2">
              {regional?.codigo && (
                <span className="text-xs font-bold bg-blue-500/20 text-blue-400
                                 border border-blue-500/30 px-2 py-0.5 rounded font-mono tracking-widest">
                  {regional.codigo}
                </span>
              )}
              <h1 className="text-xl font-bold text-white">
                {loadingReg ? 'Cargando...' : regional?.nombre}
              </h1>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              {formatDate(new Date())} · {estaciones?.length ?? '—'} estaciones
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Flota MRE',       value: totales?.vehiculos ?? 0,  color: 'text-white' },
            { label: 'Operativos',      value: totales?.operativos ?? 0, color: 'text-emerald-400' },
            { label: 'En Mto.',         value: totales?.en_manto ?? 0,   color: 'text-amber-400' },
            { label: 'Disponibilidad',  value: `${dispRegional}%`,
              color: dispRegional >= 80 ? 'text-emerald-400' : 'text-red-400' },
          ].map(m => (
            <div key={m.label} className="glass-panel rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-2">
                {m.label}
              </p>
              <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista estaciones */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
              Estaciones SEI
            </p>
            <p className="text-sm font-semibold text-white">
              {loadingReg ? '...' : regional?.nombre}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Clic para inspeccionar →
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !estaciones?.length ? (
          <p className="text-sm text-slate-500 text-center py-8">Sin estaciones registradas</p>
        ) : (
          <div className="divide-y divide-white/5">
            {estaciones.map(e => {
              const disp = Number(e.total_vehiculos) > 0
                ? Math.round((Number(e.operativos) / Number(e.total_vehiculos)) * 100) : 0
              const dispColor = disp >= 80 ? 'text-emerald-400' : disp >= 50 ? 'text-amber-400' : 'text-red-400'
              const barColor  = disp >= 80 ? 'bg-emerald-500' : disp >= 50 ? 'bg-amber-500' : 'bg-red-500'
              const oaci = OACI_STYLE[e.categoria_icao] ?? OACI_STYLE.D

              return (
                <button key={e.id} onClick={() => navigate(`/estacion/${e.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4
                             hover:bg-blue-500/5 transition-all group text-left">

                  {/* IATA */}
                  <div className="shrink-0 text-center w-14">
                    <p className="font-mono font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                      {e.codigo_iata}
                    </p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded
                                     border ${oaci.bg} ${oaci.text} ${oaci.border}
                                     uppercase tracking-wider`}>
                      CAT {e.categoria_icao?.toString().replace(/cat\s*/i, "").trim()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                      {e.aeropuerto}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                      {e.ciudad}
                    </p>
                  </div>

                  {/* MRE count */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-lg font-bold font-mono text-white">{e.total_vehiculos}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">MRE</p>
                  </div>

                  {/* Barra */}
                  <div className="hidden md:block w-28">
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-600 uppercase tracking-wider">RADAR</span>
                      <span className={`font-mono font-bold ${dispColor}`}>{disp}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${disp}%` }}/>
                    </div>
                  </div>

                  {/* Alertas */}
                  <div className="flex gap-1 shrink-0">
                    {Number(e.ots_abiertas) > 0 && (
                      <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                       border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                        {e.ots_abiertas} OT
                      </span>
                    )}
                    {Number(e.fuera_servicio) > 0 && (
                      <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                       border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                        {e.fuera_servicio} FS
                      </span>
                    )}
                  </div>

                  {/* Flecha */}
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                    className="text-slate-700 group-hover:text-blue-400 shrink-0 transition-colors">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
