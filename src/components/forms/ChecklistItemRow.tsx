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
  { valor: ResultadoItem.OK,        label: 'OK',    color: 'border-gray-200 text-gray-500',   activeColor: 'border-green-500 bg-green-50 text-green-700 font-semibold' },
  { valor: ResultadoItem.Observacion,label: 'OBS', color: 'border-gray-200 text-gray-500',   activeColor: 'border-amber-500 bg-amber-50 text-amber-700 font-semibold' },
  { valor: ResultadoItem.Falla,     label: 'FALLA', color: 'border-gray-200 text-gray-500',   activeColor: 'border-red-500 bg-red-50 text-red-700 font-semibold' },
  { valor: ResultadoItem.NoAplica,  label: 'N/A',   color: 'border-gray-200 text-gray-500',   activeColor: 'border-gray-400 bg-gray-100 text-gray-600 font-semibold' },
]

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item, resultado, observacion, onChange, onObservacion
}: Props) {
  const isFalla      = resultado === ResultadoItem.Falla
  const isObservacion= resultado === ResultadoItem.Observacion

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5 transition-colors',
      isFalla       ? 'border-red-200 bg-red-50/50' :
      isObservacion ? 'border-amber-200 bg-amber-50/30' :
      resultado === ResultadoItem.OK ? 'border-green-100 bg-green-50/20' :
      'border-gray-100 bg-white'
    )}>
      <div className="flex items-center gap-3">
        {/* Indicador crítico */}
        {item.critico && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Ítem crítico" />
        )}

        {/* Descripción */}
        <p className="flex-1 text-sm text-gray-800 leading-snug">{item.descripcion}</p>

        {/* Botones resultado */}
        <div className="flex gap-1 shrink-0">
          {OPCIONES.map(op => (
            <button
              key={op.valor}
              type="button"
              onClick={() => onChange(item.id, op.valor)}
              className={cn(
                'text-[11px] px-2 py-1 rounded-md border transition-all',
                resultado === op.valor ? op.activeColor : op.color + ' hover:bg-gray-50'
              )}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campo observación — aparece cuando corresponde */}
      {(isFalla || isObservacion) && (
        <textarea
          placeholder={isFalla
            ? 'Descripción de la falla (obligatorio)...'
            : 'Observación (opcional)...'}
          value={observacion}
          onChange={e => onObservacion(item.id, e.target.value)}
          rows={2}
          className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none bg-white"
        />
      )}
    </div>
  )
})
