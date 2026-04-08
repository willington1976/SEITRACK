import { useNacionalStats } from '@/hooks/useReportes'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'

export default function DashboardNacional() {
  const { data: stats, isLoading } = useNacionalStats()

  const totales = stats?.reduce((acc, r) => ({
    vehiculos:    acc.vehiculos    + Number(r.total_vehiculos),
    operativos:   acc.operativos   + Number(r.operativos),
    en_manto:     acc.en_manto     + Number(r.en_manto),
    fuera:        acc.fuera        + Number(r.fuera_servicio),
    insp_hoy:     acc.insp_hoy    + Number(r.inspecciones_hoy),
    ots:          acc.ots          + Number(r.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, en_manto: 0, fuera: 0, insp_hoy: 0, ots: 0 })

  const disponibilidad = totales && totales.vehiculos > 0
    ? Math.round((totales.operativos / totales.vehiculos) * 100)
    : 0

  return (
    <div className="space-y-8 page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            Centro de Mando <span className="text-blue-500 text-sm font-mono ml-2">Nacional</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2 italic">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado: {formatDate(new Date())} · 6 regionales · 36 estaciones
          </p>
        </div>
        <div className="hidden md:block">
          <Badge variant="info" className="font-mono py-1 px-3">SISTEMA OPERATIVO</Badge>
        </div>
      </div>

      {/* KPIs nacionales estilo Instrumentación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'FLOTA TOTAL',       value: isLoading ? '—' : String(totales?.vehiculos ?? 0),    color: 'text-slate-100', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'OPERATIVOS',        value: isLoading ? '—' : String(totales?.operativos ?? 0),   color: 'text-emerald-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'EN MANTENIMIENTO',  value: isLoading ? '—' : String(totales?.en_manto ?? 0),     color: 'text-amber-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'DISPONIBILIDAD',    value: isLoading ? '—' : `${disponibilidad}%`,               color: disponibilidad >= 80 ? 'text-blue-400' : 'text-red-400', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        ].map(m => (
          <div key={m.label} className="glass-panel rounded-2xl p-5 relative overflow-hidden group shadow-xl transition-all hover:scale-[1.02]">
            {/* Indicador lateral de color */}
            <div className={cn("absolute left-0 top-0 w-1 h-full opacity-50", m.color.replace('text', 'bg'))} />
            <p className="text-[10px] font-bold text-slate-500 mb-1 tracking-widest">{m.label}</p>
            <div className="flex items-end justify-between">
              <p className={cn("text-3xl font-bold font-mono tracking-tighter leading-none m-0", m.color)}>
                {m.value}
              </p>
              <svg className={cn("w-5 h-5 opacity-20", m.color)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla regionales */}
      <Card padding={false} className="border-t-4 border-t-blue-600">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <p className="text-xs font-bold text-slate-200 uppercase tracking-widest">Estado por regional</p>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-slate-700" />
             <div className="w-2 h-2 rounded-full bg-slate-700" />
             <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {stats?.map(r => {
              const disp = Number(r.total_vehiculos) > 0
                ? Math.round((Number(r.operativos) / Number(r.total_vehiculos)) * 100)
                : 0
              return (
                <div key={r.id} className="flex items-center gap-6 px-6 py-4 hover:bg-white/5 transition-all group cursor-default">
                  {/* Código regional */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                    <span className="text-xs font-bold font-mono text-blue-400">{r.codigo}</span>
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-100 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                      {r.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {r.total_estaciones} ESTACIONES · {r.total_vehiculos} MRE
                    </p>
                  </div>

                  {/* Estados */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Badge variant="success" className="bg-emerald-500/5 text-emerald-500 border-none font-mono">
                      {r.operativos} OP
                    </Badge>
                    {Number(r.en_manto) > 0 && (
                      <Badge variant="warning" className="bg-amber-500/5 text-amber-500 border-none font-mono">
                        {r.en_manto} MTO
                      </Badge>
                    )}
                    {Number(r.fuera_servicio) > 0 && (
                      <Badge variant="danger" className="bg-red-500/5 text-red-500 border-none font-mono">
                        {r.fuera_servicio} FS
                      </Badge>
                    )}
                  </div>

                  {/* Disponibilidad Progress */}
                  <div className="hidden sm:flex flex-col items-end w-32 shrink-0">
                    <div className="flex justify-between w-full mb-1">
                      <span className="text-[10px] text-slate-500 font-bold">RADAR</span>
                      <span className={cn("text-[10px] font-mono", disp >= 80 ? "text-emerald-400" : "text-amber-400")}>{disp}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", disp >= 80 ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${disp}%` }}
                      />
                    </div>
                  </div>

                  {/* Alert Indicators */}
                  <div className="flex gap-2 shrink-0">
                    {Number(r.ots_abiertas) > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                         <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                         <span className="text-[10px] font-bold text-red-400 font-mono">{r.ots_abiertas} OT</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
        <p>Telemetry Node: 0xF29A-BC</p>
        <p>Refresco Automático: 120s</p>
      </div>
    </div>
  )
}
