import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useRegionalStats } from '@/hooks/useReportes'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

const ICAO_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  B: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  C: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  D: { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
  // Categorías V, VI, III, IV también pueden aparecer
  I:   { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  II:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  III: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  IV:  { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
  V:   { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
  VI:  { bg: 'bg-slate-700/30',  text: 'text-slate-400',  border: 'border-white/10' },
}

function useRegionalInfo(regionalId: string | undefined) {
  return useQuery({
    queryKey: ['regional', regionalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('regionales')
        .select('id, nombre, codigo')
        .eq('id', regionalId!)
        .single()
      return data
    },
    enabled: !!regionalId,
  })
}

export default function DashboardRegional() {
  const navigate   = useNavigate()
  const usuario    = useAuthStore(s => s.usuario)
  const regionalId = (usuario?.estacion as { regional_id?: string } | undefined)?.regional_id

  const { data: regional }   = useRegionalInfo(regionalId)
  const { data: estaciones, isLoading } = useRegionalStats(regionalId)

  const totales = estaciones?.reduce((acc, e) => ({
    vehiculos:  acc.vehiculos  + Number(e.total_vehiculos),
    operativos: acc.operativos + Number(e.operativos),
    ots:        acc.ots        + Number(e.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, ots: 0 })

  const dispRegional = totales && totales.vehiculos > 0
    ? Math.round((totales.operativos / totales.vehiculos) * 100) : 0
  const dispColor = dispRegional >= 80 ? 'text-emerald-400' : dispRegional >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="relative space-y-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Vista Regional
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {regional?.nombre?.toUpperCase() ?? 'DASHBOARD'}
            {regional?.codigo && (
              <span className="ml-3 text-sm font-semibold bg-blue-500/20 text-blue-400
                               border border-blue-500/30 px-2 py-0.5 rounded font-mono tracking-widest">
                {regional.codigo}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {formatDate(new Date())} · {estaciones?.length ?? '—'} estaciones bajo mando
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Estaciones Activas', value: estaciones?.length ?? '—', color: 'text-white' },
          { label: 'Flota Total Regional', value: totales?.vehiculos ?? '—', color: 'text-blue-400' },
          { label: 'Órdenes de Trabajo', value: totales?.ots ?? '—',
            color: (totales?.ots ?? 0) > 0 ? 'text-red-400' : 'text-slate-500' },
        ].map(m => (
          <div key={m.label} className="glass-panel rounded-2xl border border-white/5 p-5">
            <p className={`text-4xl font-bold font-mono ${m.color}`}>
              {isLoading ? '—' : m.value}
            </p>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-2">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Lista estaciones */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
              Estaciones bajo mando
            </p>
            <p className="text-sm font-semibold text-white">
              Métricas de disponibilidad por nodo
            </p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Clic para inspeccionar →
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {estaciones?.map(e => {
              const disp = Number(e.total_vehiculos) > 0
                ? Math.round((Number(e.operativos) / Number(e.total_vehiculos)) * 100) : 0
              const dispC = disp >= 80 ? 'text-emerald-400' : disp >= 50 ? 'text-amber-400' : 'text-red-400'
              const barC  = disp >= 80 ? 'bg-emerald-500' : disp >= 50 ? 'bg-amber-500' : 'bg-red-500'
              // Detectar categoría ICAO — puede ser número romano o letra
              const cat    = e.categoria_icao?.toString().trim() ?? 'D'
              const icao   = ICAO_STYLE[cat] ?? ICAO_STYLE.D

              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/estacion/${e.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4
                             hover:bg-blue-500/5 transition-all group text-left"
                >
                  {/* IATA */}
                  <div className="shrink-0 text-center w-14">
                    <p className="font-mono font-bold text-base text-white
                                 group-hover:text-blue-300 transition-colors">
                      {e.codigo_iata}
                    </p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border
                                     uppercase tracking-wider ${icao.bg} ${icao.text} ${icao.border}`}>
                      CAT {cat}
                    </span>
                  </div>

                  {/* Nombre y ciudad */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200
                                 group-hover:text-white transition-colors truncate">
                      {e.aeropuerto}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                      {e.ciudad}
                    </p>
                  </div>

                  {/* MRE */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-lg font-bold font-mono text-white">{e.total_vehiculos}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">MRE</p>
                  </div>

                  {/* Barra RADAR */}
                  <div className="hidden md:block w-28">
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-600 uppercase tracking-wider">RADAR</span>
                      <span className={`font-mono font-bold ${dispC}`}>
                        {e.total_vehiculos > 0 ? `${disp}%` : '—'}
                      </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barC}`}
                           style={{ width: e.total_vehiculos > 0 ? `${disp}%` : '0%' }}/>
                    </div>
                  </div>

                  {/* Alertas */}
                  <div className="flex gap-1 shrink-0">
                    {Number(e.operativos) > 0 && (
                      <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400
                                       border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                        {e.operativos}OP
                      </span>
                    )}
                    {Number(e.en_manto) > 0 && (
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400
                                       border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                        {e.en_manto}MTO
                      </span>
                    )}
                    {Number(e.ots_abiertas) > 0 && (
                      <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                       border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                        {e.ots_abiertas} OT
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

        <div className="px-5 py-3 border-t border-white/5 flex justify-between">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
            Disponibilidad regional: <span className={dispColor}>{dispRegional}%</span>
          </p>
          <p className="text-[9px] text-slate-600 uppercase tracking-widest">
            Refresco automático: 120s
          </p>
        </div>
      </div>
    </div>
  )
}
