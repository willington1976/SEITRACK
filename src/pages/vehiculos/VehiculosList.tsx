import { useState } from 'react'
import { Link } from 'react-router'
import { useVehiculos } from '@/hooks/useVehiculos'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatKm, formatHoras } from '@/lib/utils'
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
    <Link to={`/vehiculos/${v.id}`} className="block group page-enter">
      <div className="glass-panel rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden">
        {/* Glow de hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity blur" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition-colors">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="text-blue-400">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100 font-mono tracking-widest leading-none">
                  {v.matricula}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                  {marcaLabel[v.marca] ?? v.marca}
                </p>
              </div>
            </div>
            <Badge variant={b.v} className="bg-slate-900/50 backdrop-blur-sm border-white/5">{b.l}</Badge>
          </div>
          
          <div className="space-y-2.5 mb-5">
            {[
              { label: 'SISTEMA/MODELO', value: `${v.modelo} · ${v.anio}` },
              { label: 'KILOMETRAJE',    value: formatKm(v.kilometraje_actual) },
              { label: 'MOTOR H/M',      value: formatHoras(v.horas_motor) },
              { label: 'MTO SCHEDULE',   value: v.programa_mto || 'N/A' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0">
                <span className="text-[9px] font-bold text-slate-500 tracking-wider font-mono">{row.label}</span>
                <span className="text-[11px] font-bold text-slate-300 font-mono group-hover:text-blue-300 transition-colors uppercase tracking-tighter">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
             <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
               Acceder al Sistema
               <svg viewBox="0 0 20 20" width="10" height="10" fill="currentColor">
                 <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
               </svg>
             </span>
             <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="w-1 h-1 rounded-full bg-slate-700" />
             </div>
          </div>
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
    <div className="space-y-6 page-enter">
      {/* Header con botón moderno */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase group flex items-center gap-3">
             Inventario Operativo <span className="text-blue-500 text-xs font-mono">FLOTA MRE</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {vehiculos?.length ?? 0} unidades vinculadas al nodo actual
          </p>
        </div>
        <Link
          to="/vehiculos/nuevo"
          className="px-6 py-2.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl
                     hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 
                     flex items-center justify-center gap-2 uppercase tracking-widest border border-white/10"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Nueva MRE
        </Link>
      </div>

      {/* Barra de Búsqueda y Filtros Aero */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="text-slate-500 group-focus-within:text-blue-400">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
          </div>
          <input
            type="search"
            placeholder="Escanear matrícula o buscar modelo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 shadow-inner border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all font-mono"
          />
        </div>
        
        <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 gap-1">
          {(['todos', ...Object.values(EstadoVehiculo)] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "px-4 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest",
                filtro === f
                  ? 'bg-blue-600 text-white shadow-lg border border-white/10'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              {f === 'todos' ? 'TOTAL' : estadoBadge[f as EstadoVehiculo]?.l ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Unidades */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size="lg" />
          <p className="text-[10px] font-bold text-slate-500 animate-pulse tracking-widest uppercase">Escaneando Red de Datos...</p>
        </div>
      ) : !filtrados?.length ? (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed border-white/10">
          <svg viewBox="0 0 24 24" width="48" height="48" className="text-slate-800 mb-4 opacity-50">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
            {busqueda ? 'No se encontraron unidades en el radar' : 'Sin unidades asignadas a este nodo'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map(v => <VehiculoCard key={v.id} v={v} />)}
        </div>
      )}
    </div>
  )
}
