import { useAuthStore } from '@/stores/auth.store'
import { useRegionalStats } from '@/hooks/useReportes'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'

export default function DashboardRegional() {
  const usuario    = useAuthStore(s => s.usuario)
  const regionalId = (usuario?.estacion as { regional_id?: string } | undefined)?.regional_id
  const { data: estaciones, isLoading } = useRegionalStats(regionalId)

  const totales = estaciones?.reduce((acc, e) => ({
    vehiculos:  acc.vehiculos  + Number(e.total_vehiculos),
    operativos: acc.operativos + Number(e.operativos),
    ots:        acc.ots        + Number(e.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, ots: 0 })

  return (
    <div className="space-y-8 page-enter">
      {/* Regional Console Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-3 bg-indigo-600 rounded-full" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Regional Ops Command</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            Vista de Nodo Regional
          </h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.2em] mt-1">
            {formatDate(new Date())} · STATUS: NOMINAL
          </p>
        </div>
      </div>

      {/* KPI Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'ESTACIONES ACTIVAS', value: estaciones?.length ?? 0, color: 'text-slate-100', bar: 'bg-indigo-600' },
          { label: 'FLOTA TOTAL REGIONAL', value: totales?.vehiculos ?? 0, color: 'text-blue-400', bar: 'bg-blue-600' },
          { label: 'ÓRDENES DE TRABAJO', value: totales?.ots ?? 0, color: totales?.ots && totales.ots > 0 ? 'text-red-500' : 'text-slate-400', bar: totales?.ots && totales.ots > 0 ? 'bg-red-600' : 'bg-slate-700' },
        ].map(m => (
          <div key={m.label} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", m.bar)} />
            <p className={cn("text-3xl font-bold font-mono tracking-tighter", m.color)}>{isLoading ? '—' : m.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Estaciones Grid */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
           <div>
             <h2 className="text-sm font-bold text-white uppercase tracking-tight">Estaciones bajo mando</h2>
             <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1">Métricas de disponibilidad por nodo</p>
           </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner />
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizando Terminales...</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {estaciones?.map(e => (
              <div key={e.id} className="flex items-center gap-6 px-6 py-4 hover:bg-white/5 transition-all group cursor-default">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                  <span className="text-xs font-bold font-mono text-indigo-400">{e.codigo_iata}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-100 uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                    {e.aeropuerto}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono uppercase py-0.5">
                    {e.ciudad} · CAT {e.categoria_icao}
                  </p>
                </div>

                <div className="hidden lg:flex items-center gap-2">
                  <Badge variant="success" className="bg-emerald-500/5 text-emerald-500 border-none font-bold text-[9px] uppercase tracking-tighter">
                    {e.operativos} OP
                  </Badge>
                  {Number(e.en_manto) > 0 && (
                    <Badge variant="warning" className="bg-amber-500/5 text-amber-500 border-none font-bold text-[9px] uppercase tracking-tighter">
                      {e.en_manto} MTO
                    </Badge>
                  )}
                  {Number(e.fuera_servicio) > 0 && (
                    <Badge variant="danger" className="bg-red-500/5 text-red-500 border-none font-bold text-[9px] uppercase tracking-tighter">
                      {e.fuera_servicio} FS
                    </Badge>
                  )}
                </div>

                {Number(e.ots_abiertas) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                     <span className="text-[10px] font-bold text-red-400 font-mono">{e.ots_abiertas} OT</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
