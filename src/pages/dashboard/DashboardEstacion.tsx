import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
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
  const estacionId = usuario?.estacion_id

  const { data: novedades } = useQuery({
    queryKey: ['novedades', 'estacion', estacionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('discrepancias')
        .select(`id, descripcion, sistema_afectado, criticidad, created_at,
                 vehiculo:vehiculos!inner(matricula, estacion_id)`)
        .eq('vehiculo.estacion_id', estacionId!)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: true })
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })

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

        {/* Novedades activas */}
        {(novedades?.length ?? 0) > 0 && (
          <div className="lg:col-span-3">
            <Card padding={false}>
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Novedades Activas</p>
                  <p className="text-xs text-gray-400">{novedades?.length} discrepancia{(novedades?.length ?? 0) !== 1 ? 's' : ''} abiertas</p>
                </div>
                <div className="flex gap-2">
                  {(novedades?.filter((n: any) => n.criticidad === 'alta').length ?? 0) > 0 && (
                    <span className="text-[9px] font-bold bg-red-500/10 text-red-500
                                     border border-red-500/20 px-2 py-1 rounded-lg animate-pulse">
                      {novedades?.filter((n: any) => n.criticidad === 'alta').length} crítica{(novedades?.filter((n: any) => n.criticidad === 'alta').length ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {(novedades?.filter((n: any) => n.criticidad === 'media').length ?? 0) > 0 && (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600
                                     border border-amber-500/20 px-2 py-1 rounded-lg">
                      {novedades?.filter((n: any) => n.criticidad === 'media').length} media{(novedades?.filter((n: any) => n.criticidad === 'media').length ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {(novedades as any[])?.map(n => {
                  const dias = Math.floor((Date.now() - new Date(n.created_at).getTime()) / (1000*60*60*24))
                  const CRIT: Record<string, { dot: string; text: string; label: string }> = {
                    alta:  { dot: 'bg-red-500',   text: 'text-red-600',   label: 'CRÍTICA' },
                    media: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'MEDIA'   },
                    baja:  { dot: 'bg-blue-500',  text: 'text-blue-600',  label: 'LEVE'    },
                  }
                  const cr = CRIT[n.criticidad] ?? CRIT.baja
                  return (
                    <div key={n.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                      <span className={'w-2 h-2 rounded-full shrink-0 mt-1 ' + cr.dot + (n.criticidad === 'alta' ? ' animate-pulse' : '')}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 leading-snug">{n.descripcion}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[9px] text-blue-600 font-bold">{(n.vehiculo as any)?.matricula}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">{n.sistema_afectado}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[9px] text-gray-400">{dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días'}</span>
                        </div>
                      </div>
                      <span className={'text-[9px] font-bold ' + cr.text}>{cr.label}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

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
