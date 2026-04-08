// ─── Home del Libro de Guardia para el Bombero ───────────────────────────────

import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useScope } from '@/hooks/useScope'
import { Spinner } from '@/components/ui/Spinner'

export default function LibroHome() {
  const navigate = useNavigate()
  const { estacionId } = useScope()
  const { data: vehiculos, isLoading } = useVehiculos(estacionId)

  useEffect(() => {
    if (isLoading || !vehiculos) return
    // Un solo vehículo → ir directo
    if (vehiculos.length === 1) {
      navigate(`/vehiculos/${vehiculos[0].id}/libro`, { replace: true })
    }
  }, [vehiculos, isLoading, navigate])

  if (!isLoading && vehiculos && vehiculos.length > 1) {
    return (
      <div className="relative space-y-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Selección de unidad
          </p>
          <h1 className="text-2xl font-bold text-white">LIBRO DE GUARDIA</h1>
          <p className="text-slate-400 text-xs mt-1">Selecciona la MRE</p>
        </div>
        <div className="space-y-2">
          {vehiculos.map(v => (
            <button key={v.id} onClick={() => navigate(`/vehiculos/${v.id}/libro`)}
              className="w-full glass-panel rounded-2xl border border-white/5
                         hover:border-blue-500/30 transition-all p-4
                         flex items-center gap-4 group text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                              flex items-center justify-center">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="text-blue-400">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-mono font-bold text-white group-hover:text-blue-300 transition-colors">{v.matricula}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{v.modelo}</p>
              </div>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                className="text-slate-600 group-hover:text-blue-400 transition-colors">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return <div className="flex justify-center py-20"><Spinner size="lg"/></div>
}
