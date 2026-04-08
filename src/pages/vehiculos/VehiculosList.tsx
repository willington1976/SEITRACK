import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useScope } from '@/hooks/useScope'
import { Spinner } from '@/components/ui/Spinner'
import { EstadoVehiculo, Rol } from '@/core/enums'
import { useAuthStore } from '@/stores/auth.store'
import type { Vehiculo } from '@/core/types'

// ─── Estilos Mission Control ──────────────────────────────────────────────────

const ESTADO_STYLE: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
  [EstadoVehiculo.Operativo]:        { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'OPERATIVO',  dot: 'bg-emerald-400' },
  [EstadoVehiculo.EnMantenimiento]:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   label: 'EN MTO.',    dot: 'bg-amber-400' },
  [EstadoVehiculo.FueraDeServicio]:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'GROUNDED',   dot: 'bg-red-400' },
  [EstadoVehiculo.Inspeccion]:       { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    label: 'INSPECC.',   dot: 'bg-blue-400' },
}

// ─── Tipos extendidos ─────────────────────────────────────────────────────────

interface VehiculoConEstacion extends Vehiculo {
  estacion?: {
    nombre:      string
    codigo_iata: string
    ciudad:      string
    regional_id: string
    regional?:   { nombre: string; codigo: string }
  }
}

// ─── Card de vehículo ─────────────────────────────────────────────────────────

function VehiculoCard({ v, showEstacion }: { v: VehiculoConEstacion; showEstacion?: boolean }) {
  const navigate = useNavigate()
  const es = ESTADO_STYLE[v.estado] ?? ESTADO_STYLE[EstadoVehiculo.Operativo]

  return (
    <div
      onClick={() => navigate(`/vehiculos/${v.id}`)}
      className="glass-panel rounded-2xl border border-white/5 hover:border-white/10
                 transition-all group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20
                          flex items-center justify-center">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" className="text-blue-400">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
            </svg>
          </div>
          <div>
            <p className="font-mono font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
              {v.matricula}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              {v.marca?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${es.dot}`} />
          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-widest
                           ${es.bg} ${es.text} ${es.border}`}>
            {es.label}
          </span>
        </div>
      </div>

      {/* Datos */}
      <div className="p-4 space-y-2">
        {[
          { l: 'SISTEMA/MODELO', v: `${v.modelo} · ${v.anio}` },
          { l: 'KILOMETRAJE',    v: `${v.kilometraje_actual?.toLocaleString('es-CO')} KM` },
          { l: 'MOTOR H/M',     v: `${v.horas_motor?.toLocaleString('es-CO')} H` },
          { l: 'MTO SCHEDULE',  v: v.programa_mto },
        ].map(r => (
          <div key={r.l} className="flex justify-between items-center">
            <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{r.l}</span>
            <span className="text-[10px] font-mono font-medium text-slate-300">{r.v}</span>
          </div>
        ))}

        {showEstacion && v.estacion && (
          <div className="flex justify-between items-center pt-1 border-t border-white/5">
            <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">ESTACIÓN</span>
            <span className="text-[10px] font-mono font-bold text-blue-400">
              {v.estacion.codigo_iata} — {v.estacion.nombre}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] text-slate-600 uppercase tracking-widest">Acceder al sistema →</span>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"
          className="text-slate-700 group-hover:text-blue-400 transition-colors">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
        </svg>
      </div>
    </div>
  )
}

// ─── Vista agrupada por Regional/Estación (Jefe Nacional) ────────────────────

function VistaAgrupada({ vehiculos }: { vehiculos: VehiculoConEstacion[] }) {
  const [regionalesColapsadas, setRegionalesColapsadas] = useState<Set<string>>(new Set())

  // Agrupar: Regional → Estación → Vehículos
  const grupos = useMemo(() => {
    const mapa: Record<string, {
      regionalNombre: string
      regionalCodigo: string
      estaciones: Record<string, {
        iata: string; nombre: string; ciudad: string
        vehiculos: VehiculoConEstacion[]
      }>
    }> = {}

    for (const v of vehiculos) {
      const est     = v.estacion
      const regId   = est?.regional_id ?? 'sin-regional'
      const regNom  = (est?.regional as any)?.nombre ?? 'Sin regional'
      const regCod  = (est?.regional as any)?.codigo ?? '??'
      const iata    = est?.codigo_iata ?? '???'

      if (!mapa[regId]) {
        mapa[regId] = { regionalNombre: regNom, regionalCodigo: regCod, estaciones: {} }
      }
      if (!mapa[regId].estaciones[iata]) {
        mapa[regId].estaciones[iata] = {
          iata, nombre: est?.nombre ?? '', ciudad: est?.ciudad ?? '', vehiculos: []
        }
      }
      mapa[regId].estaciones[iata].vehiculos.push(v)
    }

    return Object.entries(mapa).sort((a, b) =>
      a[1].regionalNombre.localeCompare(b[1].regionalNombre)
    )
  }, [vehiculos])

  function toggleRegional(id: string) {
    setRegionalesColapsadas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {grupos.map(([regId, reg]) => {
        const colapsada    = regionalesColapsadas.has(regId)
        const estaciones   = Object.values(reg.estaciones)
        const totalVehiculos = estaciones.reduce((a, e) => a + e.vehiculos.length, 0)
        const operativos   = estaciones.reduce((a, e) =>
          a + e.vehiculos.filter(v => v.estado === EstadoVehiculo.Operativo).length, 0)
        const disp = totalVehiculos > 0 ? Math.round((operativos / totalVehiculos) * 100) : 0
        const dispColor = disp >= 80 ? 'text-emerald-400' : disp >= 50 ? 'text-amber-400' : 'text-red-400'
        const barColor  = disp >= 80 ? 'bg-emerald-500' : disp >= 50 ? 'bg-amber-500' : 'bg-red-500'

        return (
          <div key={regId} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            {/* Header regional — clickeable para colapsar */}
            <button
              onClick={() => toggleRegional(regId)}
              className="w-full flex items-center gap-4 px-5 py-4
                         hover:bg-blue-500/5 transition-all text-left"
            >
              {/* Código */}
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                              flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-blue-400 tracking-widest">
                  {reg.regionalCodigo}
                </span>
              </div>

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white uppercase tracking-wide">
                  {reg.regionalNombre}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {estaciones.length} ESTACIONES · {totalVehiculos} MRE
                </p>
              </div>

              {/* Barra disponibilidad */}
              <div className="hidden md:block w-32">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-slate-600 uppercase tracking-wider">RADAR</span>
                  <span className={`font-mono font-bold ${dispColor}`}>{disp}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${disp}%` }}/>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-1.5 shrink-0">
                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400
                                 border border-emerald-500/20 px-2 py-1 rounded font-mono">
                  {operativos} OP
                </span>
                {totalVehiculos - operativos > 0 && (
                  <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                   border border-red-500/20 px-2 py-1 rounded font-mono">
                    {totalVehiculos - operativos} FS
                  </span>
                )}
              </div>

              {/* Flecha colapsar */}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                className={`text-slate-600 shrink-0 transition-transform ${colapsada ? '' : 'rotate-90'}`}>
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
              </svg>
            </button>

            {/* Estaciones con sus vehículos */}
            {!colapsada && (
              <div className="border-t border-white/5">
                {estaciones.map(est => (
                  <div key={est.iata} className="border-b border-white/5 last:border-0">
                    {/* Sub-header estación */}
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/2">
                      <span className="font-mono font-bold text-sm text-blue-300">{est.iata}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                        {est.nombre} · {est.ciudad}
                      </span>
                      <span className="ml-auto text-[9px] font-mono text-slate-600">
                        {est.vehiculos.length} MRE
                      </span>
                    </div>

                    {/* Grid de vehículos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                      {est.vehiculos.map(v => (
                        <VehiculoCard key={v.id} v={v} showEstacion={false} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Vista plana — Jefe de Estación ──────────────────────────────────────────

function VistaPlana({ vehiculos }: { vehiculos: VehiculoConEstacion[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {vehiculos.map(v => <VehiculoCard key={v.id} v={v} />)}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VehiculosList() {
  const navigate   = useNavigate()
  const usuario    = useAuthStore(s => s.usuario)
  const { esNacional, estacionId } = useScope()

  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modoVista,    setModoVista]    = useState<'agrupado' | 'grilla'>(
    esNacional ? 'agrupado' : 'grilla'
  )
  const [filtroEstacionSel, setFiltroEstacionSel] = useState<string | null>(null)

  const estacionFiltro = esNacional ? filtroEstacionSel : estacionId
  const { data: vehiculos, isLoading } = useVehiculos(estacionFiltro)

  const { data: estaciones } = useQuery({
    queryKey: ['estaciones', 'selector'],
    queryFn: async () => {
      const { data } = await supabase
        .from('estaciones')
        .select('id, nombre, codigo_iata')
        .eq('activa', true).order('nombre')
      return data ?? []
    },
    enabled: esNacional,
  })

  const filtrados = useMemo(() => (vehiculos ?? []).filter(v => {
    const matchBusq = !busqueda ||
      v.matricula.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.modelo.toLowerCase().includes(busqueda.toLowerCase())
    const matchEst = filtroEstado === 'todos' || v.estado === filtroEstado
    return matchBusq && matchEst
  }) as VehiculoConEstacion[], [vehiculos, busqueda, filtroEstado])

  const stats = {
    total:     vehiculos?.length ?? 0,
    operativo: vehiculos?.filter(v => v.estado === EstadoVehiculo.Operativo).length ?? 0,
    manto:     vehiculos?.filter(v => v.estado === EstadoVehiculo.EnMantenimiento).length ?? 0,
    fuera:     vehiculos?.filter(v => v.estado === EstadoVehiculo.FueraDeServicio).length ?? 0,
  }

  const puedeCrear = [Rol.JefeNacional, Rol.JefeEstacion, Rol.JefeRegional]
    .includes(usuario?.rol as Rol)

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            {esNacional ? 'Inventario Nacional' : 'Inventario Operativo'}
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">FLOTA MRE</h1>
          <p className="text-slate-400 text-xs mt-1">
            {isLoading ? 'Cargando...' : `${stats.total} unidades vinculadas al nodo actual`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Toggle vista — solo para nacional */}
          {esNacional && (
            <div className="flex gap-1 bg-slate-950 border border-white/5 rounded-xl p-1">
              {[
                { v: 'agrupado', icon: '▤', label: 'AGRUPADO' },
                { v: 'grilla',   icon: '⊞', label: 'GRILLA' },
              ].map(m => (
                <button key={m.v} onClick={() => setModoVista(m.v as any)}
                  className={`px-3 py-1.5 text-[9px] rounded-lg font-bold uppercase tracking-wider
                             transition-all flex items-center gap-1 ${
                    modoVista === m.v
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
          )}

          {puedeCrear && (
            <button onClick={() => navigate('/vehiculos/nuevo')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                         text-white text-xs font-bold px-4 py-2.5 rounded-xl
                         transition-all shadow-lg shadow-blue-600/20 uppercase tracking-wide">
              + Nueva MRE
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: 'Total',      v: stats.total,     c: 'text-white' },
            { l: 'Operativos', v: stats.operativo, c: 'text-emerald-400' },
            { l: 'En Mto.',    v: stats.manto,     c: 'text-amber-400' },
            { l: 'Grounded',   v: stats.fuera,     c: stats.fuera > 0 ? 'text-red-400' : 'text-slate-500' },
          ].map(m => (
            <div key={m.l} className="glass-panel rounded-xl p-3 border border-white/5 text-center">
              <p className={`text-xl font-bold font-mono ${m.c}`}>{m.v}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{m.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-5.44-2.32a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"/>
          </svg>
          <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Escanear matrícula o buscar modelo..."
            className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-slate-200 placeholder-slate-600
                       focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
        </div>

        {/* Filtro estación — solo en modo grilla nacional */}
        {esNacional && modoVista === 'grilla' && (
          <select value={filtroEstacionSel ?? ''}
            onChange={e => setFiltroEstacionSel(e.target.value || null)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-sm
                       text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30">
            <option value="">Todas las estaciones</option>
            {estaciones?.map((e: any) => (
              <option key={e.id} value={e.id}>{e.codigo_iata} — {e.nombre}</option>
            ))}
          </select>
        )}

        {/* Filtro estado */}
        <div className="flex gap-1 bg-slate-950 border border-white/5 rounded-xl p-1">
          {[
            { v: 'todos',                        l: 'TOTAL' },
            { v: EstadoVehiculo.Operativo,       l: 'OPERATIVO' },
            { v: EstadoVehiculo.EnMantenimiento, l: 'MANTENIMIENTO' },
            { v: EstadoVehiculo.FueraDeServicio, l: 'FUERA SERVICIO' },
          ].map(f => (
            <button key={f.v} onClick={() => setFiltroEstado(f.v)}
              className={`px-3 py-1.5 text-[9px] rounded-lg font-bold uppercase tracking-wider
                         transition-all ${
                filtroEstado === f.v
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg"/></div>
      ) : !filtrados.length ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest">
            No se encontraron registros
          </p>
        </div>
      ) : esNacional && modoVista === 'agrupado' ? (
        <VistaAgrupada vehiculos={filtrados} />
      ) : (
        <VistaPlana vehiculos={filtrados} />
      )}
    </div>
  )
}
