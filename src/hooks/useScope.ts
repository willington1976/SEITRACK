// ─── Hook centralizado de scope por rol ──────────────────────────────────────
// Determina qué datos puede ver cada rol y expone los filtros necesarios
// Usar en todos los módulos para consistencia

import { useAuthStore } from '@/stores/auth.store'
import { Rol } from '@/core/enums'

export interface Scope {
  esNacional:  boolean
  esRegional:  boolean
  esEstacion:  boolean
  // null = sin filtro (ve todo), string = filtra por ese ID
  estacionId:  string | null
  regionalId:  string | null
  // Para queries SQL
  filtroEstacion: string | undefined
}

export function useScope(): Scope {
  const usuario = useAuthStore(s => s.usuario)

  const rol        = usuario?.rol as Rol | undefined
  const esNacional = rol === Rol.JefeNacional || rol === Rol.DSNA
  const esRegional = rol === Rol.JefeRegional

  const estacionId = esNacional
    ? null                              // jefe nacional: sin filtro
    : (usuario?.estacion_id ?? null)   // todos los demás: su estación

  const regionalId = esNacional
    ? null
    : (usuario?.estacion as { regional_id?: string } | undefined)?.regional_id ?? null

  return {
    esNacional,
    esRegional,
    esEstacion: !esNacional && !esRegional,
    estacionId,
    regionalId,
    filtroEstacion: estacionId ?? undefined,
  }
}
