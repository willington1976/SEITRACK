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
    <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-slate-700 transition-all hover:border-l-blue-500 group relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div className="flex gap-4">
             <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center shrink-0">
               <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">{formatDate(insp.fecha).split(' ')[1]}</span>
               <span className="text-lg font-bold text-white leading-none">{formatDate(insp.fecha).split(' ')[0]}</span>
             </div>
             <div>
               <p className="text-sm font-bold text-slate-100 uppercase tracking-tight">
                 {faseLabel[insp.fase] ?? insp.fase}
               </p>
               <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">
                 Turno {insp.turno} · REF: {insp.id.split('-')[0]}
               </p>
             </div>
          </div>
          <div className="flex gap-2 items-center self-start">
            <Badge variant={rb?.v ?? 'muted'} className="font-mono px-3 border border-white/5">{rb?.l ?? insp.resultado}</Badge>
            {insp.liberado_servicio
              ? <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-tighter font-bold">Clear for Ops</Badge>
              : <Badge variant="danger" className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-tighter font-bold">Grounded</Badge>
            }
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-white/[0.03] mb-4">
          {[
            { label: 'REGISTRO KM', value: insp.km_al_momento.toLocaleString('es-CO') },
            { label: 'HORAS MOTOR', value: insp.horas_al_momento.toLocaleString('es-CO') },
            { label: 'TÉCNICO/INSP', value: (insp.inspector as { nombre_completo: string } | undefined)?.nombre_completo?.split(' ')[0] ?? 'N/D' },
            { label: 'UTC EST.', value: formatDateTime(insp.fecha).split(' ')[1] },
          ].map(d => (
            <div key={d.label}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{d.label}</p>
              <p className="text-xs font-bold text-slate-300 font-mono">{d.value}</p>
            </div>
          ))}
        </div>

        {insp.observaciones && (
          <div className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Observaciones Técnicas</p>
            <p className="text-xs text-slate-300 italic">"{insp.observaciones}"</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              insp.firmado_en ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse"
            )} />
            {insp.firmado_en ? (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Bitácora Validada · {formatDateTime(insp.firmado_en)}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                Pendiente de Firma Autorizada
              </p>
            )}
          </div>

          {!insp.firmado_en && canFirmar && (
            <button
              onClick={() => firmar({ id: insp.id, vehiculoId, liberado: insp.resultado !== 'rechazado' })}
              disabled={isPending}
              className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {isPending ? 'Procesando...' : 'Validar Registro →'}
            </button>
          )}
        </div>
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
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
             Historial de Inspecciones <span className="text-blue-500 text-xs font-mono">{vehiculo?.matricula}</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
             Logbook técnico: {inspecciones?.length ?? 0} entradas registradas
          </p>
        </div>
        <Link
          to={`/vehiculos/${vehiculoId}/inspecciones/nueva`}
          className="px-6 py-2.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 uppercase tracking-widest border border-white/10"
        >
          Nueva inspección
        </Link>
      </div>

      {/* Selector de Fase Rápido Aeronáutico */}
      <div className="grid grid-cols-2 sm:flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.values(FaseInspeccion).map(f => (
          <Link
            key={f}
            to={`/vehiculos/${vehiculoId}/inspecciones/nueva?fase=${f}`}
            className="shrink-0 text-[10px] font-bold px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all uppercase tracking-widest whitespace-nowrap text-center"
          >
            {faseLabel[f] ?? f}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size="lg" />
          <p className="text-[10px] font-bold text-slate-500 animate-pulse tracking-widest uppercase">Accediendo a la Bitácora Digital...</p>
        </div>
      ) : !inspecciones?.length ? (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed border-white/10">
          <svg viewBox="0 0 24 24" width="48" height="48" className="text-slate-800 mb-4 opacity-50">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10V7H7v3zm0 4h10v-3H7v3zm0 4h10v-3H7v3z"/>
          </svg>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
            Sin registros de inspección en este nodo
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
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
