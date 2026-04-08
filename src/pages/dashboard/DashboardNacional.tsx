import { useNavigate } from 'react-router'
import { useNacionalStats } from '@/hooks/useReportes'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

export default function DashboardNacional() {
  const { data: stats, isLoading } = useNacionalStats()
  const navigate = useNavigate()

  const totales = stats?.reduce((acc, r) => ({
    vehiculos:  acc.vehiculos  + Number(r.total_vehiculos),
    operativos: acc.operativos + Number(r.operativos),
    en_manto:   acc.en_manto   + Number(r.en_manto),
    fuera:      acc.fuera      + Number(r.fuera_servicio),
    insp_hoy:   acc.insp_hoy   + Number(r.inspecciones_hoy),
    ots:        acc.ots        + Number(r.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, en_manto: 0, fuera: 0, insp_hoy: 0, ots: 0 })

  const disponibilidad = totales && totales.vehiculos > 0
    ? Math.round((totales.operativos / totales.vehiculos) * 100) : 0

  return (
    <div className="relative space-y-6">
      {/* Iluminación de fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Localización
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CENTRO DE MANDO
            <span className="ml-3 text-sm font-semibold bg-blue-500/20 text-blue-400
                             border border-blue-500/30 px-2 py-0.5 rounded uppercase tracking-widest">
              Nacional
            </span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Sincronizado: {formatDate(new Date())} · 6 regionales · 36 estaciones
          </p>
        </div>
        <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-semibold tracking-wide">SISTEMA OPERATIVO</span>
        </div>
      </div>

      {/* KPIs nacionales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Flota Total',       value: isLoading ? '—' : String(totales?.vehiculos ?? 0),
            sub: 'MRE registradas', color: 'text-white', icon: '🚒' },
          { label: 'Operativos',        value: isLoading ? '—' : String(totales?.operativos ?? 0),
            sub: 'en servicio', color: 'text-emerald-400', icon: '✓' },
          { label: 'En Mantenimiento',  value: isLoading ? '—' : String(totales?.en_manto ?? 0),
            sub: 'en taller', color: 'text-amber-400', icon: '⚙' },
          { label: 'Disponibilidad',    value: isLoading ? '—' : `${disponibilidad}%`,
            sub: 'flota operativa', icon: '📡',
            color: disponibilidad >= 80 ? 'text-emerald-400' : 'text-red-400' },
        ].map(m => (
          <div key={m.label}
            className="glass-panel rounded-2xl p-4 border border-white/5
                       hover:border-white/10 transition-all">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-2">
              {m.label}
            </p>
            <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla regionales */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
              Módulo de supervisión
            </p>
            <p className="text-sm font-semibold text-white">Estado por Regional</p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Clic para inspeccionar →
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {stats?.map(r => {
              const disp = Number(r.total_vehiculos) > 0
                ? Math.round((Number(r.operativos) / Number(r.total_vehiculos)) * 100) : 0
              const dispColor = disp >= 80 ? 'text-emerald-400' : disp >= 50 ? 'text-amber-400' : 'text-red-400'
              const barColor  = disp >= 80 ? 'bg-emerald-500' : disp >= 50 ? 'bg-amber-500' : 'bg-red-500'

              return (
                <button key={r.id} onClick={() => navigate(`/regional/${r.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4
                             hover:bg-blue-500/5 transition-all group text-left">

                  {/* Código */}
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                                  flex items-center justify-center shrink-0
                                  group-hover:bg-blue-500/20 transition-all">
                    <span className="text-[9px] font-bold text-blue-400 tracking-widest">{r.codigo}</span>
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                      {r.nombre}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {r.total_estaciones} ESTACIONES · {r.total_vehiculos} MRE
                    </p>
                  </div>

                  {/* Barra disponibilidad */}
                  <div className="hidden md:block w-32">
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500 uppercase tracking-wider">RADAR</span>
                      <span className={`font-mono font-bold ${dispColor}`}>{disp}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`}
                           style={{ width: `${disp}%` }}/>
                    </div>
                  </div>

                  {/* Alertas */}
                  <div className="flex gap-1.5 shrink-0">
                    {Number(r.operativos) > 0 && (
                      <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400
                                       border border-emerald-500/20 px-2 py-1 rounded-lg
                                       font-mono tracking-wide">
                        {r.operativos} OP
                      </span>
                    )}
                    {Number(r.en_manto) > 0 && (
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400
                                       border border-amber-500/20 px-2 py-1 rounded-lg
                                       font-mono tracking-wide">
                        {r.en_manto} MTO
                      </span>
                    )}
                    {Number(r.ots_abiertas) > 0 && (
                      <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                       border border-red-500/20 px-2 py-1 rounded-lg
                                       font-mono tracking-wide">
                        {r.ots_abiertas} OT
                      </span>
                    )}
                  </div>

                  {/* Flecha */}
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                    className="text-slate-600 group-hover:text-blue-400 shrink-0 transition-colors">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              )
            })}
          </div>
        )}

        <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
            Telemetry Node: 0xF29A-BC
          </p>
          <p className="text-[9px] text-slate-600 uppercase tracking-widest">
            Refresco automático: 120s
          </p>
        </div>
      </div>
    </div>
  )
}
