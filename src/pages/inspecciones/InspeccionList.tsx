import { useParams, Link } from 'react-router'
import { useInspecciones, useFirmarInspeccion } from '@/hooks/useInspecciones'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatDateTime } from '@/lib/utils'
import { FaseInspeccion, Rol } from '@/core/enums'
import type { Inspeccion } from '@/core/types'
import { cn } from '@/lib/utils'

const faseLabel: Record<string, string> = {
  cambio_turno: 'Cambio de turno',
  f0: 'F0 — Diaria', f1: 'F1', f2: 'F2', f3: 'F3',
}
const resultadoBadge = {
  aprobado:          { v: 'success' as const, l: 'Aprobado' },
  con_observaciones: { v: 'warning' as const, l: 'Con obs.' },
  rechazado:         { v: 'danger'  as const, l: 'Rechazado' },
}

function InspeccionCard({ insp, vehiculoId, canFirmar }: {
  insp: Inspeccion; vehiculoId: string; canFirmar: boolean
}) {
  const { mutate: firmar, isPending } = useFirmarInspeccion()
  const rb = resultadoBadge[insp.resultado as keyof typeof resultadoBadge]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{faseLabel[insp.fase] ?? insp.fase}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(insp.fecha)} · Turno {insp.turno}
          </p>
        </div>
        <div className="flex gap-1.5 items-center">
          <Badge variant={rb?.v ?? 'muted'}>{rb?.l ?? insp.resultado}</Badge>
          {insp.liberado_servicio
            ? <Badge variant="success">Liberado</Badge>
            : <Badge variant="danger">No liberado</Badge>
          }
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div>
          <p className="text-gray-400">Km</p>
          <p className="font-medium text-gray-700">{insp.km_al_momento.toLocaleString('es-CO')}</p>
        </div>
        <div>
          <p className="text-gray-400">Horas motor</p>
          <p className="font-medium text-gray-700">{insp.horas_al_momento.toLocaleString('es-CO')}</p>
        </div>
        <div>
          <p className="text-gray-400">Inspector</p>
          <p className="font-medium text-gray-700 truncate">
            {(insp.inspector as { nombre_completo: string } | undefined)?.nombre_completo?.split(' ')[0] ?? '—'}
          </p>
        </div>
      </div>

      {insp.observaciones && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          {insp.observaciones}
        </p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        {insp.firmado_en ? (
          <p className="text-[11px] text-gray-400">
            Firmado {formatDateTime(insp.firmado_en)}
          </p>
        ) : canFirmar ? (
          <button
            onClick={() => firmar({ id: insp.id, vehiculoId, liberado: insp.resultado !== 'rechazado' })}
            disabled={isPending}
            className="text-xs text-sei-600 font-medium hover:underline disabled:opacity-50"
          >
            {isPending ? 'Firmando...' : 'Firmar inspección →'}
          </button>
        ) : (
          <p className="text-[11px] text-amber-600">Pendiente de firma</p>
        )}
      </div>
    </div>
  )
}

export default function InspeccionList() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { data: inspecciones, isLoading } = useInspecciones(vehiculoId!)
  const { data: vehiculo } = useVehiculo(vehiculoId!)
  const usuario = useAuthStore(s => s.usuario)

  const canFirmar = usuario?.rol === Rol.JefeEstacion || usuario?.rol === Rol.JefeRegional

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">
            Inspecciones — {vehiculo?.matricula ?? '…'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {inspecciones?.length ?? 0} registros
          </p>
        </div>
        <Link
          to={`/vehiculos/${vehiculoId}/inspecciones/nueva`}
          className="px-4 py-2 bg-sei-600 text-white text-xs font-semibold rounded-xl hover:bg-sei-700 transition-colors"
        >
          Nueva inspección
        </Link>
      </div>

      {/* Accesos rápidos por fase */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {Object.values(FaseInspeccion).map(f => (
          <Link
            key={f}
            to={`/vehiculos/${vehiculoId}/inspecciones/nueva?fase=${f}`}
            className="shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-sei-50 hover:border-sei-300 transition-colors whitespace-nowrap"
          >
            {faseLabel[f] ?? f}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !inspecciones?.length ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            Sin inspecciones registradas para este vehículo
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inspecciones.map(i => (
            <InspeccionCard
              key={i.id}
              insp={i}
              vehiculoId={vehiculoId!}
              canFirmar={canFirmar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
