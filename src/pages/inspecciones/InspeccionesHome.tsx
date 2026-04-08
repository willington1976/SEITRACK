// ─── Home de Inspecciones para el Bombero ────────────────────────────────────
// Detecta el vehículo(s) de la estación del bombero y redirige
// Si hay un solo vehículo → directo al formulario F0
// Si hay varios → muestra selector

import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { useScope } from '@/hooks/useScope'
import { Rol } from '@/core/enums'
import { Spinner } from '@/components/ui/Spinner'

export default function InspeccionesHome() {
  const navigate  = useNavigate()
  const usuario   = useAuthStore(s => s.usuario)
  const { estacionId } = useScope()
  const { data: vehiculos, isLoading } = useVehiculos(estacionId)

  const rol = usuario?.rol as Rol

  useEffect(() => {
    if (isLoading || !vehiculos) return

    // Roles con acceso a listado completo
    if (rol === Rol.JefeNacional || rol === Rol.JefeRegional ||
        rol === Rol.JefeEstacion || rol === Rol.ODMA || rol === Rol.DSNA) {
      // Si hay un vehículo en la estación, ir al listado de ese vehículo
      if (vehiculos.length === 1) {
        navigate(`/vehiculos/${vehiculos[0].id}/inspecciones`, { replace: true })
      }
      return
    }

    // Bombero — ir directo al formulario F0 del primer vehículo
    if (rol === Rol.Bombero) {
      if (vehiculos.length === 1) {
        navigate(
          `/vehiculos/${vehiculos[0].id}/inspecciones/nueva?fase=cambio_turno`,
          { replace: true }
        )
      }
    }
  }, [vehiculos, isLoading, rol, navigate])

  // Si hay varios vehículos, mostrar selector
  if (!isLoading && vehiculos && vehiculos.length > 1) {
    return (
      <div className="relative space-y-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Selección de unidad
          </p>
          <h1 className="text-2xl font-bold text-white">INSPECCIÓN F0</h1>
          <p className="text-slate-400 text-xs mt-1">
            Selecciona la MRE que vas a inspeccionar
          </p>
        </div>

        <div className="space-y-2">
          {vehiculos.map(v => (
            <button
              key={v.id}
              onClick={() => {
                const fase = rol === Rol.Bombero ? 'cambio_turno' : ''
                const url  = fase
                  ? `/vehiculos/${v.id}/inspecciones/nueva?fase=${fase}`
                  : `/vehiculos/${v.id}/inspecciones`
                navigate(url)
              }}
              className="w-full glass-panel rounded-2xl border border-white/5
                         hover:border-blue-500/30 transition-all p-4
                         flex items-center gap-4 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                              flex items-center justify-center">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="text-blue-400">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-mono font-bold text-white group-hover:text-blue-300 transition-colors">
                  {v.matricula}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                  {v.modelo} · {v.anio} · {v.estado}
                </p>
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

  return (
    <div className="flex justify-center py-20">
      <Spinner size="lg" />
    </div>
  )
}
