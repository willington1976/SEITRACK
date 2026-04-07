import { useParams, Link, useNavigate } from 'react-router'
import { useVehiculo } from '@/hooks/useVehiculos'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras } from '@/lib/utils'
import { EstadoVehiculo } from '@/core/enums'

const estadoBadge = {
  [EstadoVehiculo.Operativo]:       { v: 'success' as const, l: 'Operativo' },
  [EstadoVehiculo.EnMantenimiento]: { v: 'warning' as const, l: 'En mantenimiento' },
  [EstadoVehiculo.FueraDeServicio]: { v: 'danger'  as const, l: 'Fuera de servicio' },
  [EstadoVehiculo.Inspeccion]:      { v: 'info'    as const, l: 'En inspección' },
}

export default function VehiculoDetail() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { data: v, isLoading } = useVehiculo(vehiculoId!)
  const navigate = useNavigate()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!v) return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-sm">Vehículo no encontrado</p>
      <button onClick={() => navigate(-1)} className="mt-2 text-sei-600 text-sm hover:underline">Volver</button>
    </div>
  )

  const b = estadoBadge[v.estado as EstadoVehiculo]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 01 0 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{v.matricula}</h1>
            <p className="text-sm text-gray-400">{v.modelo} · {v.anio}</p>
          </div>
        </div>
        <Badge variant={b.v}>{b.l}</Badge>
      </div>

      {/* Info básica */}
      <Card>
        <CardHeader title="Datos del vehículo" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ['Matrícula',     v.matricula],
            ['N° de serie',   v.numero_serie],
            ['Marca',         v.marca],
            ['Modelo',        v.modelo],
            ['Año',           String(v.anio)],
            ['Adquisición',   formatDate(v.fecha_adquisicion)],
            ['Kilometraje',   formatKm(v.kilometraje_actual)],
            ['Horas motor',   formatHoras(v.horas_motor)],
            ['Programa MTO',  v.programa_mto],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-800 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Acciones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { to: `/vehiculos/${v.id}/inspecciones/nueva`, label: 'Nueva inspección', color: 'bg-sei-600 text-white hover:bg-sei-700' },
          { to: `/vehiculos/${v.id}/inspecciones`,       label: 'Ver inspecciones', color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
          { to: `/mantenimiento/nueva`,                  label: 'Nueva OT',         color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
          { to: `/vehiculos/${v.id}/libro`,              label: 'Libro operación',  color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
        ].map(a => (
          <Link
            key={a.label}
            to={a.to}
            className={`text-center text-sm font-medium py-2.5 px-3 rounded-xl transition-colors ${a.color}`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* Componentes */}
      {v.componentes && v.componentes.length > 0 && (
        <Card>
          <CardHeader title="Componentes registrados" subtitle={`${v.componentes.length} componentes`} />
          <div className="space-y-2">
            {v.componentes.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{c.descripcion}</p>
                  <p className="text-xs text-gray-400">P/N: {c.numero_parte} · {formatHoras(c.horas_acumuladas)}</p>
                </div>
                <Badge variant={c.estado === 'apto' ? 'success' : c.estado === 'reparacion' ? 'warning' : 'danger'}>
                  {c.estado}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// Exportar PDF del historial — añadir al componente existente
export function exportarHistorialPDF(vehiculo: any, inspecciones: any[], ordenes: any[], generadoPor: string) {
  import('@/lib/pdf').then(({ generarPDFHistorialVehiculo }) => {
    generarPDFHistorialVehiculo({
      matricula:   vehiculo.matricula,
      modelo:      vehiculo.modelo,
      anio:        vehiculo.anio,
      programa_mto: vehiculo.programa_mto,
      estacion:    (vehiculo.estacion as any)?.nombre ?? '',
      estado:      vehiculo.estado,
      kilometraje: vehiculo.kilometraje_actual,
      horas:       vehiculo.horas_motor,
      inspecciones: inspecciones.map(i => ({
        fecha:     i.fecha,
        fase:      i.fase,
        turno:     i.turno,
        resultado: i.resultado,
        inspector: (i.inspector as any)?.nombre_completo ?? '',
        liberado:  i.liberado_servicio,
      })),
      ordenes: ordenes.map(ot => ({
        numero_ot:   ot.numero_ot,
        tipo:        ot.tipo,
        estado:      ot.estado,
        descripcion: ot.descripcion,
        fecha_cierre: ot.fecha_cierre,
      })),
    }, generadoPor)
  })
}
