import { useParams, Link, useNavigate } from 'react-router'
import { useVehiculo } from '@/hooks/useVehiculos'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras, cn } from '@/lib/utils'
import { EstadoVehiculo } from '@/core/enums'

const estadoBadge = {
  [EstadoVehiculo.Operativo]:       { v: 'success' as const, l: 'OPERATIVO', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  [EstadoVehiculo.EnMantenimiento]: { v: 'warning' as const, l: 'EN MANTENIMIENTO', color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  [EstadoVehiculo.FueraDeServicio]: { v: 'danger'  as const, l: 'FUERA DE SERVICIO', color: 'text-red-500',     bg: 'bg-red-500/10' },
  [EstadoVehiculo.Inspeccion]:      { v: 'info'    as const, l: 'EN INSPECCIÓN', color: 'text-blue-400',    bg: 'bg-blue-400/10' },
}

export default function VehiculoDetail() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { data: v, isLoading } = useVehiculo(vehiculoId!)
  const navigate = useNavigate()

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><Spinner size="lg" /><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizando Archivos de Flota...</p></div>
  if (!v) return (
    <div className="text-center py-24 glass-panel rounded-3xl">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Unidad no detectada en el Registro Nacional</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-slate-900 border border-white/5 text-white text-[10px] font-bold rounded-xl hover:bg-white/5 transition-all">REINTENTAR ACCESO</button>
    </div>
  )

  const b = estadoBadge[v.estado as EstadoVehiculo] || estadoBadge[EstadoVehiculo.Operativo]

  return (
    <div className="space-y-8 page-enter">
      {/* Flight Deck Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center hover:bg-white/5 transition-all group">
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" className="text-slate-500 group-hover:text-white transition-colors">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 01 0 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{v.matricula}</h1>
              <Badge variant={b.v} className={cn("px-3 py-1 rounded-lg font-bold text-[9px] tracking-widest border-none", b.color, b.bg)}>
                {b.l}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1 italic">
               {v.marca || 'UNKNOWN'} {v.modelo || 'UNIT'} · {v.anio || 'XXXX'} S/N: {v.numero_serie || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-3xl p-8">
           <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Especificaciones de Planta</p>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-8 gap-x-4">
            {[
              { l: 'PLACA / MATRÍCULA', v: v.matricula, mono: true },
              { l: 'NÚMERO DE SERIE / VIN', v: v.numero_serie, mono: true, color: 'text-blue-400' },
              { l: 'MARCA DEL FABRICANTE', v: v.marca },
              { l: 'MODELO DE REFERENCIA', v: v.modelo },
              { l: 'AÑO DE PRODUCCIÓN', v: String(v.anio) },
              { l: 'FECHA DE ADQUISICIÓN', v: formatDate(v.fecha_adquisicion) },
              { l: 'ODÓMETRO TOTAL', v: formatKm(v.kilometraje_actual), mono: true, color: 'text-indigo-400' },
              { l: 'HORAS DE MOTOR', v: formatHoras(v.horas_motor), mono: true, color: 'text-indigo-400' },
              { l: 'PROGRAMA DE MTO', v: v.programa_mto || 'NOMINAL', mono: true },
            ].map(i => (
              <div key={i.l} className="space-y-1">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{i.l}</p>
                <p className={cn("text-[13px] font-bold uppercase tracking-tight", i.mono ? "font-mono" : "text-slate-100", i.color || "text-slate-100")}>{i.v || '—'}</p>
              </div>
            ))}
           </div>
        </div>

        {/* Tactical Actions Card */}
        <div className="glass-panel rounded-3xl p-8 bg-blue-600/5 border-blue-600/10">
           <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
             <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Protocolos de Operatividad</p>
           </div>
           
           <div className="flex flex-col gap-3">
            {[
              { to: `/vehiculos/${v.id}/inspecciones/nueva`, l: 'Nueva Inspección', primary: true },
              { to: `/vehiculos/${v.id}/inspecciones`,       l: 'Historial Inspección' },
              { to: `/mantenimiento/nueva`,                  l: 'Abrir Orden de Trabajo' },
              { to: `/vehiculos/${v.id}/libro`,              l: 'Bitácora de Operación' },
            ].map(a => (
              <Link key={a.l} to={a.to} className={cn("w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all text-center border", a.primary ? "bg-blue-600 text-white border-white/10 shadow-xl shadow-blue-600/20 hover:bg-blue-500" : "bg-slate-900 text-slate-400 border-white/5 hover:border-blue-600/30 hover:text-white")}>
                {a.l}
              </Link>
            ))}
            <button 
              onClick={() => exportarHistorialPDF(v, [], [], 'ADMIN')} 
              className="w-full mt-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-[.25em] hover:text-white hover:border-white/10 transition-all"
            >
              Exportar Dossier PDF
            </button>
           </div>
        </div>
      </div>

      {/* Components Sub-System List */}
      {v.componentes && v.componentes.length > 0 && (
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
             <div>
               <h2 className="text-sm font-bold text-white uppercase tracking-tight">Anatomía de Componentes Críticos</h2>
               <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1">{v.componentes.length} SUBSISTEMAS MONITOREADOS</p>
             </div>
          </div>
          <div className="divide-y divide-white/5">
            {v.componentes.map(c => (
              <div key={c.id} className="flex items-center justify-between px-8 py-4 hover:bg-white/5 transition-all group">
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-slate-100 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{c.descripcion}</p>
                  <p className="text-[10px] text-slate-500 font-mono py-0.5 uppercase tracking-wide">
                    P/N: {c.numero_parte || 'N/A'} · RUNTIME: {formatHoras(c.horas_acumuladas)}
                  </p>
                </div>
                <Badge variant={c.estado === 'apto' ? 'success' : c.estado === 'reparacion' ? 'warning' : 'danger'} className="text-[8px] font-bold border-none uppercase tracking-widest px-3 py-1">
                  {c.estado}
                </Badge>
              </div>
            ))}
          </div>
        </div>
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
