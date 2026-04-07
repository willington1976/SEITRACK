import { Link } from 'react-router'
import { useOrdenesAbiertas } from '@/hooks/useMantenimiento'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { OrdenTrabajo } from '@/core/types'
import { Criticidad } from '@/core/enums'

const estadoBadge = {
  abierta:    { v: 'danger'  as const, l: 'Abierta' },
  en_proceso: { v: 'warning' as const, l: 'En proceso' },
  cerrada:    { v: 'success' as const, l: 'Cerrada' },
  cancelada:  { v: 'muted'   as const, l: 'Cancelada' },
}
const prioridadColor = {
  [Criticidad.Alta]:  'border-l-4 border-l-red-400',
  [Criticidad.Media]: 'border-l-4 border-l-amber-400',
  [Criticidad.Baja]:  'border-l-4 border-l-gray-200',
}

function OTCard({ ot }: { ot: OrdenTrabajo }) {
  const sb = estadoBadge[ot.estado as keyof typeof estadoBadge]
  const pc = prioridadColor[ot.prioridad as Criticidad] ?? ''
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 ${pc}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-mono text-gray-500">{ot.numero_ot || 'OT pendiente'}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5 line-clamp-2">{ot.descripcion}</p>
        </div>
        <Badge variant={sb?.v ?? 'muted'}>{sb?.l ?? ot.estado}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{ot.tipo}</span>
        {ot.fecha_programada && <span>Prog. {formatDate(ot.fecha_programada)}</span>}
      </div>
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-gray-50">
        <Link
          to={`/mantenimiento/${ot.id}`}
          className="text-xs text-sei-600 hover:underline"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}

export default function OrdenesTrabajoList() {
  const { data: ordenes, isLoading } = useOrdenesAbiertas()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Órdenes de trabajo</h1>
          <p className="text-xs text-gray-400 mt-0.5">{ordenes?.length ?? 0} abiertas</p>
        </div>
        <Link
          to="/mantenimiento/nueva"
          className="px-4 py-2 bg-sei-600 text-white text-xs font-semibold rounded-xl hover:bg-sei-700 transition-colors"
        >
          Nueva OT
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !ordenes?.length ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            No hay órdenes de trabajo abiertas
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordenes.map(ot => <OTCard key={ot.id} ot={ot} />)}
        </div>
      )}
    </div>
  )
}
