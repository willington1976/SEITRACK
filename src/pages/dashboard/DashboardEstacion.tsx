import { Link } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useKPIsEstacion, useFallasPorSistema } from '@/hooks/useReportes'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras } from '@/lib/utils'
import type { Vehiculo } from '@/core/types'
import { EstadoVehiculo } from '@/core/enums'

const estadoBadge: Record<EstadoVehiculo, { variant: 'success'|'warning'|'danger'|'info'; label: string }> = {
  [EstadoVehiculo.Operativo]:        { variant: 'success', label: 'Operativo' },
  [EstadoVehiculo.EnMantenimiento]:  { variant: 'warning', label: 'En mantenimiento' },
  [EstadoVehiculo.FueraDeServicio]:  { variant: 'danger',  label: 'Fuera de servicio' },
  [EstadoVehiculo.Inspeccion]:       { variant: 'info',    label: 'En inspección' },
}

function VehiculoRow({ v }: { v: Vehiculo }) {
  const b = estadoBadge[v.estado as EstadoVehiculo] ?? { variant: 'muted' as const, label: v.estado }
  return (
    <Link
      to={`/vehiculos/${v.id}`}
      className="flex items-center gap-3 py-3 px-3 hover:bg-gray-50 rounded-xl -mx-3 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-sei-50 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="text-sei-600">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
          <path d="M3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3zM10 7h3.586l2 2H10V7z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-sei-700 transition-colors">{v.matricula}</p>
        <p className="text-xs text-gray-400 truncate">{v.modelo} · {v.anio}</p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-xs text-gray-600">{formatKm(v.kilometraje_actual)}</p>
        <p className="text-[11px] text-gray-400">{formatHoras(v.horas_motor)}</p>
      </div>
      <Badge variant={b.variant}>{b.label}</Badge>
    </Link>
  )
}

// Mini barra horizontal para gráfico de fallas
function BarraFallas({ sistema, total, maximo }: { sistema: string; total: number; maximo: number }) {
  const pct = maximo > 0 ? Math.round((total / maximo) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 text-gray-600 truncate shrink-0">{sistema}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-right font-medium text-gray-700 shrink-0">{total}</span>
    </div>
  )
}

export default function DashboardEstacion() {
  const usuario = useAuthStore(s => s.usuario)
  const { data: vehiculos, isLoading: loadingV } = useVehiculos()
  const { data: kpis,      isLoading: loadingK } = useKPIsEstacion()
  const { data: fallas,    isLoading: loadingF } = useFallasPorSistema(usuario?.estacion_id)

  const maxFallas = fallas?.[0]?.total_fallas ?? 1

  return (
    <div className="space-y-5">
      {/* Saludo */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">
          Buenos días, {usuario?.nombre_completo.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {formatDate(new Date())} ·{' '}
          {(usuario?.estacion as { aeropuerto?: string } | undefined)?.aeropuerto ?? 'Estación'}
        </p>
      </div>

      {/* KPIs en tiempo real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label:  'Operativos',
            value:  loadingK ? '—' : `${kpis?.vehiculos_operativos ?? 0}/${kpis?.vehiculos_total ?? 0}`,
            color:  'text-green-600', bg: 'bg-green-50',
          },
          {
            label:  'OTs abiertas',
            value:  loadingK ? '—' : String(kpis?.ots_abiertas ?? 0),
            color:  (kpis?.ots_alta_prioridad ?? 0) > 0 ? 'text-red-600' : 'text-gray-900',
            bg:     (kpis?.ots_alta_prioridad ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50',
          },
          {
            label:  'Inspecciones hoy',
            value:  loadingK ? '—' : String(kpis?.inspecciones_hoy ?? 0),
            color:  'text-blue-600', bg: 'bg-blue-50',
          },
          {
            label:  'Stock bajo',
            value:  loadingK ? '—' : String(kpis?.stock_bajo ?? 0),
            color:  (kpis?.stock_bajo ?? 0) > 0 ? 'text-amber-600' : 'text-gray-900',
            bg:     (kpis?.stock_bajo ?? 0) > 0 ? 'bg-amber-50' : 'bg-gray-50',
          },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Flota */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Flota asignada"
              subtitle={vehiculos ? `${vehiculos.length} MRE` : ''}
              action={
                <Link to="/vehiculos" className="text-xs text-sei-600 hover:underline">Ver todo</Link>
              }
            />
            {loadingV ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="space-y-0">
                {vehiculos?.map(v => <VehiculoRow key={v.id} v={v} />)}
                {!vehiculos?.length && (
                  <p className="text-sm text-gray-400 text-center py-6">Sin vehículos asignados</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Fallas por sistema */}
          <Card>
            <CardHeader title="Fallas últimos 30 días" subtitle="por sistema" />
            {loadingF ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : !fallas?.length ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin fallas registradas</p>
            ) : (
              <div className="space-y-2.5">
                {fallas.slice(0, 6).map(f => (
                  <BarraFallas
                    key={f.sistema}
                    sistema={f.sistema}
                    total={Number(f.total_fallas)}
                    maximo={Number(maxFallas)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader title="Acciones rápidas" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/vehiculos',        label: 'Inspección F0', color: 'bg-sei-50 text-sei-700' },
                { to: '/mantenimiento/nueva', label: 'Nueva OT',   color: 'bg-blue-50 text-blue-700' },
                { to: '/mantenimiento',    label: 'Ver OTs',        color: 'bg-amber-50 text-amber-700' },
                { to: '/vehiculos',        label: 'Libro op.',      color: 'bg-purple-50 text-purple-700' },
              ].map(a => (
                <Link
                  key={a.label}
                  to={a.to}
                  className={`${a.color} rounded-xl p-3 hover:opacity-80 transition-opacity text-xs font-semibold`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
