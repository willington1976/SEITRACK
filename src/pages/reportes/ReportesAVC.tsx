import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAVC, useFallasPorSistema } from '@/hooks/useReportes'
import { Spinner } from '@/components/ui/Spinner'
import { generarPDFAVC } from '@/lib/pdf'
import { format, subDays } from 'date-fns'
import { Rol } from '@/core/enums'
import { cn } from '@/lib/utils'

function exportCSV(data: unknown[], nombre: string) {
  if (!data.length) return
  const keys   = Object.keys(data[0] as object)
  const header = keys.join(';')
  const rows   = data.map(row =>
    keys.map(k => String((row as Record<string, unknown>)[k] ?? '')).join(';')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${nombre}_${format(new Date(), 'yyyyMMdd')}.csv`
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ReportesAVC() {
  const usuario    = useAuthStore(s => s.usuario)
  const esNacional = usuario?.rol === Rol.JefeNacional || usuario?.rol === Rol.DSNA

  const [desde, setDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: avc,    isLoading: loadingAVC } = useAVC({ desde, hasta })
  const { data: fallas, isLoading: loadingF    } = useFallasPorSistema(
    esNacional ? undefined : usuario?.estacion_id
  )

  const resumen = avc?.reduce((acc, r) => ({
    inspecciones: acc.inspecciones + Number(r.total_inspecciones),
    aprobadas:    acc.aprobadas    + Number(r.insp_aprobadas),
    rechazadas:   acc.rechazadas   + Number(r.insp_rechazadas),
    fallas:       acc.fallas       + Number(r.total_fallas),
    fCriticas:    acc.fCriticas    + Number(r.fallas_criticas),
    ots:          acc.ots          + Number(r.ots_generadas),
  }), { inspecciones: 0, aprobadas: 0, rechazadas: 0, fallas: 0, fCriticas: 0, ots: 0 })

  const dispProm = avc?.length
    ? Math.round(avc.reduce((a, r) => a + Number(r.tasa_disponibilidad), 0) / avc.length)
    : 0

  const maxFalla = Number(fallas?.[0]?.total_fallas ?? 1)

  function handlePDF() {
    if (!avc?.length || !usuario) return
    generarPDFAVC(avc, { desde, hasta, generadoPor: usuario.nombre_completo })
  }

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* Header Aeronáutico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Dashboard Analítico AVC</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-1 italic">
            Capítulo X · GSAN-4.1-05-01 · Vigilancia Continua
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => avc && exportCSV(avc, 'reporte_avc')}
            disabled={!avc?.length}
            className="px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest disabled:opacity-30"
          >
            Exportar CSV
          </button>
          <button
            onClick={handlePDF}
            disabled={!avc?.length}
            className="px-5 py-2.5 bg-blue-600 border border-white/10 rounded-xl text-[10px] font-bold text-white hover:bg-blue-500 transition-all uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-30"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M2.5 1A1.5 1.5 0 001 2.5v11A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0013.5 1h-11zM8 4a.75.75 0 01.75.75v3.5h1.5a.25.25 0 01.177.427l-2.25 2.25a.25.25 0 01-.354 0l-2.25-2.25A.25.25 0 015.75 8.25h1.5v-3.5A.75.75 0 018 4z"/>
            </svg>
            Generar Dossier PDF
          </button>
        </div>
      </div>

      {/* Filtros Glass */}
      <div className="glass-panel rounded-3xl p-6 flex gap-6 items-end flex-wrap border-white/5">
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Ventana Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-blue-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Ventana Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-blue-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
        </div>
        <div className="flex-1 flex justify-end">
           <div className="px-4 py-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest text-right">Período de Análisis</p>
              <p className="text-[11px] font-mono text-slate-400">30 DÍAS DE OPERACIÓN ACTIVA</p>
           </div>
        </div>
      </div>

      {/* KPIs Grid */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { l: 'Inspecciones',   v: resumen.inspecciones, c: 'text-white'  },
            { l: 'Aprobadas',      v: resumen.aprobadas,    c: 'text-emerald-400' },
            { l: 'Rechazadas',     v: resumen.rechazadas,   c: resumen.rechazadas > 0 ? 'text-red-400' : 'text-slate-400' },
            { l: 'Fallas Report.', v: resumen.fallas,       c: 'text-amber-400' },
            { l: 'F. Críticas',    v: resumen.fCriticas,    c: resumen.fCriticas > 0 ? 'text-red-500' : 'text-slate-400' },
            { l: 'Ticket OTs',     v: resumen.ots,          c: 'text-blue-400'  },
            { l: 'Disponibilidad', v: `${dispProm}%`,       c: dispProm >= 80 ? 'text-emerald-400' : 'text-red-400', special: true },
          ].map(m => (
            <div key={m.l} className={cn("glass-panel rounded-2xl p-4 border-white/5 text-center flex flex-col justify-center", m.special && "bg-blue-500/5")}>
              <p className={`text-xl font-bold font-mono tracking-tighter ${m.c}`}>{m.v}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-tight">{m.l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla Technical Detail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-3xl overflow-hidden border-white/5">
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">Status de Flota por Unidad</h3>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{avc?.length ?? 0} Unidades en Radar</p>
              </div>
            </div>
            {loadingAVC ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3"><Spinner /><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Calculando Algoritmos...</p></div>
            ) : !avc?.length ? (
              <div className="text-center py-20"><p className="text-xs text-slate-600 font-mono uppercase">Sin Datos de Telemetría para este Período</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-950/50 border-b border-white/5">
                    <tr>
                      {['IATA','MATRÍCULA','MODELO','INSP.','√','X','FALLAS','!','OTs','DISP.'].map(h => (
                        <th key={h} className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {avc.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3.5 text-slate-400 font-bold">{row.estacion_nombre}</td>
                        <td className="px-4 py-3.5 text-white font-mono font-bold group-hover:text-blue-400">{row.vehiculo_matricula}</td>
                        <td className="px-4 py-3.5 text-slate-500 italic">{row.vehiculo_modelo}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.total_inspecciones}</td>
                        <td className="px-4 py-3.5 text-center text-emerald-500 font-bold">{row.insp_aprobadas}</td>
                        <td className="px-4 py-3.5 text-center">
                           {Number(row.insp_rechazadas) > 0 ? <span className="text-red-500 font-bold">{row.insp_rechazadas}</span> : <span className="text-slate-800">0</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-amber-500 font-bold">{row.total_fallas}</td>
                        <td className="px-4 py-3.5 text-center">
                           {Number(row.fallas_criticas) > 0 ? <span className="text-red-600 font-black animate-pulse opacity-100">{row.fallas_criticas}</span> : <span className="text-slate-800">0</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.ots_generadas}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn("px-2 py-1 rounded text-[9px] font-black font-mono", Number(row.tasa_disponibilidad) >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                            {row.tasa_disponibilidad}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Fallas por Sistema - Gráfico Aero */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border-white/5 space-y-6">
             <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">Top Heatmap: Fallas</h3>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Distribución por Subsistemas</p>
             </div>
             {loadingF ? (
               <div className="flex justify-center py-6"><Spinner size="sm"/></div>
             ) : !fallas?.length ? (
               <p className="text-[10px] text-slate-700 text-center py-4 uppercase font-bold tracking-tighter">Sin incidencias registradas</p>
             ) : (
               <div className="space-y-4">
                 {fallas.map(f => {
                   const pct = Math.round((Number(f.total_fallas) / maxFalla) * 100)
                   return (
                     <div key={f.sistema} className="space-y-1.5">
                       <div className="flex justify-between items-end gap-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{f.sistema}</span>
                         <div className="flex items-center gap-1.5 shrink-0">
                           <span className="text-[10px] font-mono font-bold text-amber-500">{f.total_fallas}</span>
                           {Number(f.fallas_criticas) > 0 &&
                             <span className="text-[9px] font-black text-white bg-red-600 px-1.5 rounded animate-pulse">{f.fallas_criticas}!</span>}
                         </div>
                       </div>
                       <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-white/5">
                         <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all duration-1000"
                              style={{ width: `${pct}%` }}/>
                       </div>
                     </div>
                   )
                 })}
                 <div className="pt-4 flex items-center gap-4 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded bg-amber-500" />
                       <span className="text-[8px] font-bold text-slate-500 uppercase">Fallas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-4 h-2 rounded bg-red-600" />
                       <span className="text-[8px] font-bold text-slate-500 uppercase">Discrepancia Crítica</span>
                    </div>
                 </div>
               </div>
             )}
          </div>

          {/* Glosario / Info Normativa */}
          <div className="glass-panel rounded-3xl p-6 border-blue-500/10 bg-blue-500/5">
             <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">Soporte Normativo AVC</p>
             <p className="text-[10px] text-slate-400 leading-relaxed italic">
               "El sistema de análisis y vigilancia continua debe permitir a la UAEAC identificar tendencias, mitigar riesgos y asegurar la aeronavegabilidad de la flota SEI en tiempo real."
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
