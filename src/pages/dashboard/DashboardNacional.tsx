import { useNacionalStats } from '@/hooks/useReportes'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

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
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-gray-900">Vista nacional</h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatDate(new Date())} · 6 regionales · 36 estaciones</p>
      </div>

      {/* KPIs nacionales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Flota total',       value: isLoading ? '—' : String(totales?.vehiculos ?? 0),    color: 'text-gray-900' },
          { label: 'Operativos',        value: isLoading ? '—' : String(totales?.operativos ?? 0),   color: 'text-green-600' },
          { label: 'En mantenimiento',  value: isLoading ? '—' : String(totales?.en_manto ?? 0),     color: 'text-amber-600' },
          { label: 'Disponibilidad',    value: isLoading ? '—' : `${disponibilidad}%`,               color: disponibilidad >= 80 ? 'text-green-600' : 'text-red-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla regionales */}
      <Card padding={false}>
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Estado por regional</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats?.map(r => {
              const disp = Number(r.total_vehiculos) > 0
                ? Math.round((Number(r.operativos) / Number(r.total_vehiculos)) * 100)
                : 0
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  {/* Código regional */}
                  <div className="w-9 h-9 rounded-lg bg-sei-50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-sei-700">{r.codigo}</span>
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.nombre}</p>
                    <p className="text-[11px] text-gray-400">
                      {r.total_estaciones} est. · {r.total_vehiculos} MRE
                    </p>
                  </div>

                  {/* Estados */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <Badge variant="success">{r.operativos} op.</Badge>
                    {Number(r.en_manto) > 0     && <Badge variant="warning">{r.en_manto} mto.</Badge>}
                    {Number(r.fuera_servicio) > 0 && <Badge variant="danger">{r.fuera_servicio} fs.</Badge>}
                  </div>

                  {/* Estadísticas de hoy */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-700">{disp}%</p>
                    <p className="text-[11px] text-gray-400">disponibilidad</p>
                  </div>

                  {/* Alertas */}
                  <div className="flex gap-1 shrink-0">
                    {Number(r.ots_abiertas) > 0 && (
                      <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        {r.ots_abiertas} OT
                      </span>
                    )}
                    {Number(r.inspecciones_hoy) > 0 && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {r.inspecciones_hoy} insp.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-gray-400 text-right">
        Datos en tiempo real · refresca automáticamente cada 2 min
      </p>
    </div>
  )
}
