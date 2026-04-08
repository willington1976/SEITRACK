import { memo } from 'react'
import { ResultadoItem } from '@/core/enums'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/lib/checklists'

interface Props {
  item: ChecklistItem
  resultado: ResultadoItem | undefined
  observacion: string
  onChange: (id: string, resultado: ResultadoItem) => void
  onObservacion: (id: string, texto: string) => void
}

const OPCIONES: { valor: ResultadoItem; label: string; color: string; activeColor: string }[] = [
  { valor: ResultadoItem.OK,        label: 'OK',    color: 'border-white/5 text-slate-500',   activeColor: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
  { valor: ResultadoItem.Observacion,label: 'OBS', color: 'border-white/5 text-slate-500',   activeColor: 'border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' },
  { valor: ResultadoItem.Falla,     label: 'FALLA', color: 'border-white/5 text-slate-500',   activeColor: 'border-red-500/50 bg-red-500/20 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
  { valor: ResultadoItem.NoAplica,  label: 'N/A',   color: 'border-white/5 text-slate-500',   activeColor: 'border-white/20 bg-white/10 text-slate-200 font-bold' },
]

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item, resultado, observacion, onChange, onObservacion
}: Props) {
  const isFalla      = resultado === ResultadoItem.Falla
  const isObservacion= resultado === ResultadoItem.Observacion

  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 pb-4 transition-all duration-300',
      isFalla       ? 'border-red-500/30 bg-red-500/5 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]' :
      isObservacion ? 'border-amber-500/30 bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' :
      resultado === ResultadoItem.OK ? 'border-emerald-500/20 bg-emerald-500/5' :
      'border-white/5 bg-slate-900/40 hover:bg-slate-900/60'
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Indicador crítico */}
          {item.critico ? (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] shrink-0 animate-pulse" title="Ítem crítico" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
          )}

          {/* Descripción Técnica */}
          <p className={cn(
            "text-xs leading-relaxed tracking-tight",
            resultado ? "text-slate-200" : "text-slate-400"
          )}>
            {item.descripcion.toUpperCase()}
          </p>
        </div>

        {/* Botones de Comando */}
        <div className="flex gap-1.5 self-end sm:self-center">
          {OPCIONES.map(op => (
            <button
              key={op.valor}
              type="button"
              onClick={() => onChange(item.id, op.valor)}
              className={cn(
                'text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all uppercase tracking-tighter',
                resultado === op.valor ? op.activeColor : op.color + ' hover:bg-white/5 hover:text-slate-300'
              )}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campo observación integrada */}
      {(isFalla || isObservacion) && (
        <div className="mt-4 relative animate-in fade-in slide-in-from-top-2 duration-300">
          <textarea
            placeholder={isFalla
              ? 'DESCRIBA LA FALLA TÉCNICA (OBLIGATORIO)...'
              : 'OBSERVACIONES ADICIONALES (OPCIONAL)...'}
            value={observacion}
            onChange={e => onObservacion(item.id, e.target.value)}
            rows={2}
            className={cn(
               "w-full text-[11px] bg-slate-950 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 transition-all resize-none font-mono uppercase",
               isFalla ? "border-red-500/30 focus:ring-red-500/40 text-red-200" : "border-amber-500/30 focus:ring-amber-500/40 text-amber-200"
            )}
          />
        </div>
      )}
    </div>
  )
})
