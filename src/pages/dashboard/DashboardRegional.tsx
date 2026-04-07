import { useAuthStore } from '@/stores/auth.store'
import { useRegionalStats } from '@/hooks/useReportes'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

export default function DashboardRegional() {
  const usuario    = useAuthStore(s => s.usuario)
  // regional_id viene del join con la estación del usuario
  const regionalId = (usuario?.estacion as { regional_id?: string } | undefined)?.regional_id
  const { data: estaciones, isLoading } = useRegionalStats(regionalId)

  const totales = estaciones?.reduce((acc, e) => ({
    vehiculos:  acc.vehiculos  + Number(e.total_vehiculos),
    operativos: acc.operativos + Number(e.operativos),
    ots:        acc.ots        + Number(e.ots_abiertas),
  }), { vehiculos: 0, operativos: 0, ots: 0 })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-gray-900">Vista regional</h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* KPIs regionales */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Estaciones',   value: estaciones?.length ?? '—' },
          { label: 'Flota total',  value: totales?.vehiculos ?? '—' },
          { label: 'OTs abiertas', value: totales?.ots ?? '—' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-gray-900">{isLoading ? '—' : m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Estaciones de la regional</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {estaciones?.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-600">{e.codigo_iata}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.aeropuerto}</p>
                  <p className="text-[11px] text-gray-400">{e.ciudad} · {e.categoria_icao}</p>
                </div>
                <div className="hidden sm:flex gap-1.5">
                  <Badge variant="success">{e.operativos} op.</Badge>
                  {Number(e.en_manto) > 0 && <Badge variant="warning">{e.en_manto} mto.</Badge>}
                  {Number(e.fuera_servicio) > 0 && <Badge variant="danger">{e.fuera_servicio} fs.</Badge>}
                </div>
                {Number(e.ots_abiertas) > 0 && (
                  <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">
                    {e.ots_abiertas} OT
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
