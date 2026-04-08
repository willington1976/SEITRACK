import { useState } from 'react'
import { Link } from 'react-router'
import { useVehiculos } from '@/hooks/useVehiculos'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatKm, formatHoras } from '@/lib/utils'
import { EstadoVehiculo } from '@/core/enums'
import type { Vehiculo } from '@/core/types'

const estadoBadge = {
  [EstadoVehiculo.Operativo]:       { v: 'success' as const, l: 'Operativo' },
  [EstadoVehiculo.EnMantenimiento]: { v: 'warning' as const, l: 'Mantenimiento' },
  [EstadoVehiculo.FueraDeServicio]: { v: 'danger'  as const, l: 'Fuera servicio' },
  [EstadoVehiculo.Inspeccion]:      { v: 'info'    as const, l: 'Inspección' },
}

const marcaLabel: Record<string, string> = {
  oshkosh_serie_t:        'Oshkosh Serie T',
  oshkosh_striker_1500:   'Oshkosh Striker 1500',
  rosenbauer_panther_4x4: 'Rosenbauer Panther 4×4',
}

function VehiculoCard({ v }: { v: Vehiculo }) {
  const b = estadoBadge[v.estado as EstadoVehiculo] ?? { v: 'muted' as const, l: v.estado }
  return (
    <Link to={`/vehiculos/${v.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-sei-200 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-sei-700 transition-colors">
              {v.matricula}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {marcaLabel[v.marca] ?? v.marca}
            </p>
          </div>
          <Badge variant={b.v}>{b.l}</Badge>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Modelo</span>
            <span className="font-medium text-gray-700">{v.modelo} · {v.anio}</span>
          </div>
          <div className="flex justify-between">
            <span>Kilometraje</span>
            <span className="font-medium text-gray-700">{formatKm(v.kilometraje_actual)}</span>
          </div>
          <div className="flex justify-between">
            <span>Horas motor</span>
            <span className="font-medium text-gray-700">{formatHoras(v.horas_motor)}</span>
          </div>
          <div className="flex justify-between">
            <span>Programa MTO</span>
            <span className="font-medium text-gray-700">{v.programa_mto}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
          <span className="text-[11px] text-sei-600 hover:text-sei-800">Ver detalles →</span>
        </div>
      </div>
    </Link>
  )
}

export default function VehiculosList() {
  const { data: vehiculos, isLoading } = useVehiculos()
  const [filtro, setFiltro] = useState<'todos' | EstadoVehiculo>('todos')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = vehiculos?.filter(v => {
    const matchFiltro = filtro === 'todos' || v.estado === filtro
    const matchBusqueda = !busqueda ||
      v.matricula.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.modelo.toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  })

  return (
    <div className="space-y-4">
      {/* Header con botón */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Flota MRE</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {vehiculos?.length ?? 0} vehículo{vehiculos?.length !== 1 ? 's' : ''} asignados
          </p>
        </div>
        <Link
          to="/vehiculos/nuevo"
          className="px-4 py-2 bg-sei-600 text-white text-xs font-semibold rounded-xl
                     hover:bg-sei-700 transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Nueva MRE
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder="Buscar por matrícula o modelo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"
        />
        <div className="flex gap-1.5">
          {(['todos', ...Object.values(EstadoVehiculo)] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                filtro === f
                  ? 'bg-sei-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'todos' ? 'Todos' : estadoBadge[f as EstadoVehiculo]?.l ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !filtrados?.length ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            {busqueda ? 'Sin resultados para la búsqueda' : 'No hay vehículos en esta estación'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map(v => <VehiculoCard key={v.id} v={v} />)}
        </div>
      )}
    </div>
  )
}
