import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAVC, useFallasPorSistema } from '@/hooks/useReportes'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { generarPDFAVC } from '@/lib/pdf'
import { format, subDays } from 'date-fns'
import { Rol } from '@/core/enums'

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
    generarPDFAVC(avc, {
      desde, hasta,
      generadoPor: usuario.nombre_completo,
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Reportes · AVC</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Análisis y Vigilancia Continua — Cap. X Manual GSAN-4.1-05-01
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => avc && exportCSV(avc, 'reporte_avc')}
            disabled={!avc?.length}
            className="px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-700 rounded-xl
                       hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={handlePDF}
            disabled={!avc?.length}
            className="px-4 py-2 text-xs font-semibold bg-sei-600 text-white rounded-xl
                       hover:bg-sei-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M2.5 1A1.5 1.5 0 001 2.5v11A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0013.5 1h-11zM8 4a.75.75 0 01.75.75v3.5h1.5a.25.25 0 01.177.427l-2.25 2.25a.25.25 0 01-.354 0l-2.25-2.25A.25.25 0 015.75 8.25h1.5v-3.5A.75.75 0 018 4z"/>
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"/>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"/>
        </div>
      </div>

      {/* KPIs resumen */}
      {resumen && (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {[
            { l: 'Inspecciones',   v: resumen.inspecciones, c: 'text-gray-900'  },
            { l: 'Aprobadas',      v: resumen.aprobadas,    c: 'text-green-600' },
            { l: 'Rechazadas',     v: resumen.rechazadas,   c: resumen.rechazadas > 0 ? 'text-red-600' : 'text-gray-900' },
            { l: 'Fallas',         v: resumen.fallas,       c: resumen.fallas > 0 ? 'text-amber-600' : 'text-gray-900' },
            { l: 'F. críticas',    v: resumen.fCriticas,    c: resumen.fCriticas > 0 ? 'text-red-700' : 'text-gray-900' },
            { l: 'OTs',            v: resumen.ots,          c: 'text-blue-600'  },
            { l: 'Disponib. prom.',v: `${dispProm}%`,       c: dispProm >= 80 ? 'text-green-600' : 'text-red-600' },
          ].map(m => (
            <div key={m.l} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
              <p className={`text-lg font-semibold ${m.c}`}>{m.v}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{m.l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabla AVC */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Detalle por vehículo</p>
              <p className="text-xs text-gray-400">{avc?.length ?? 0} registros</p>
            </div>
            {loadingAVC ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : !avc?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin datos para el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Estación','Matrícula','Modelo','Insp.','Aprob.','Rechaz.','Fallas','F.crít.','OTs','Disponib.'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {avc.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row.estacion_nombre}</td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-gray-900">{row.vehiculo_matricula}</td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row.vehiculo_modelo}</td>
                        <td className="px-3 py-2.5 text-center">{row.total_inspecciones}</td>
                        <td className="px-3 py-2.5 text-center text-green-600 font-medium">{row.insp_aprobadas}</td>
                        <td className="px-3 py-2.5 text-center">
                          {Number(row.insp_rechazadas) > 0
                            ? <span className="text-red-600 font-semibold">{row.insp_rechazadas}</span>
                            : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {Number(row.total_fallas) > 0
                            ? <span className="text-amber-600">{row.total_fallas}</span>
                            : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {Number(row.fallas_criticas) > 0
                            ? <span className="text-red-700 font-bold">{row.fallas_criticas}</span>
                            : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">{row.ots_generadas}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-semibold ${Number(row.tasa_disponibilidad) >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                            {row.tasa_disponibilidad}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Fallas por sistema */}
        <div>
          <Card>
            <CardHeader title="Fallas por sistema" subtitle="período seleccionado"/>
            {loadingF ? (
              <div className="flex justify-center py-6"><Spinner size="sm"/></div>
            ) : !fallas?.length ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {fallas.map(f => {
                  const pct = Math.round((Number(f.total_fallas) / maxFalla) * 100)
                  return (
                    <div key={f.sistema}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 truncate">{f.sistema}</span>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <span className="font-medium text-amber-600">{f.total_fallas}</span>
                          {Number(f.fallas_criticas) > 0 &&
                            <span className="font-bold text-red-600">({f.fallas_criticas}✕)</span>}
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all"
                             style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  )
                })}
                <p className="text-[11px] text-gray-400 pt-1">✕ = fallas críticas</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
