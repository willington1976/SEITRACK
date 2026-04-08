import { Link } from 'react-router'
import { useOrdenesAbiertas } from '@/hooks/useMantenimiento'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'
import type { OrdenTrabajo } from '@/core/types'
import { Criticidad } from '@/core/enums'

const estadoBadge = {
  abierta:    { v: 'danger'  as const, l: 'ABIERTA',  color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  en_proceso: { v: 'warning' as const, l: 'EN PROCESO', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  cerrada:    { v: 'success' as const, l: 'CERRADA',  color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  cancelada:  { v: 'muted'   as const, l: 'CANCELADA', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
}

const prioridadCfg = {
  [Criticidad.Alta]:  { label: 'PRIORIDAD CRÍTICA', color: 'text-red-500', bar: 'bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.4)]' },
  [Criticidad.Media]: { label: 'PRIORIDAD MEDIA',  color: 'text-amber-500', bar: 'bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
  [Criticidad.Baja]:  { label: 'PRIORIDAD NORMAL', color: 'text-slate-400', bar: 'bg-slate-700' },
}

function OTCard({ ot }: { ot: OrdenTrabajo }) {
  const sb = estadoBadge[ot.estado as keyof typeof estadoBadge]
  const pc = prioridadCfg[ot.prioridad as Criticidad] ?? prioridadCfg[Criticidad.Baja]

  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group transition-all hover:border-white/20">
      {/* Barra lateral de prioridad técnica */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", pc.bar)} />
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                {ot.numero_ot || 'PENDIENTE'}
             </span>
             <span className={cn("text-[9px] font-bold uppercase tracking-widest", pc.color)}>
                {pc.label}
             </span>
          </div>
          
          <h3 className="text-sm font-bold text-white uppercase tracking-tight line-clamp-1">
             {ot.descripcion}
          </h3>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-slate-500 uppercase tracking-tight">
             <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                <span className="text-blue-400/80">{ot.tipo}</span>
             </div>
             {ot.fecha_programada && (
               <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span>ETA: {formatDate(ot.fecha_programada)}</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 shrink-0">
           <Badge className={cn("px-3 py-1 font-bold text-[9px] border uppercase tracking-widest", sb.color)}>
              {sb.l}
           </Badge>
           <Link
             to={`/mantenimiento/${ot.id}`}
             className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-all uppercase tracking-widest"
           >
             Acceder →
           </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrdenesTrabajoList() {
  const { data: ordenes, isLoading } = useOrdenesAbiertas()

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1 h-3 bg-red-600 rounded-full" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Job Control Console</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Mantenimiento de Flota</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
             {ordenes?.length ?? 0} ÓRDENES ACTIVAS EN SISTEMA
          </p>
        </div>
        
        <Link
          to="/mantenimiento/nueva"
          className="px-6 py-3 bg-blue-600 text-white text-[11px] font-bold rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10"
        >
          Generar Nueva OT
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
           <Spinner size="lg" />
           <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Escaneando Registros...</p>
        </div>
      ) : !ordenes?.length ? (
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl py-16">
          <div className="flex flex-col items-center text-center space-y-3">
             <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-700 border border-white/5">
                ✓
             </div>
             <div className="space-y-1">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Sistemas Operativos</p>
               <p className="text-xs text-slate-600">No hay órdenes de trabajo abiertas en esta estación.</p>
             </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ordenes.map(ot => <OTCard key={ot.id} ot={ot} />)}
        </div>
      )}
    </div>
  )
}
