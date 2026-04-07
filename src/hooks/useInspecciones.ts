import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspeccionesService } from '@/services/inspecciones.service'
import { QUERY_KEYS } from '@/lib/constants'
import type { Inspeccion, ItemInspeccion } from '@/core/types'

export function useInspecciones(vehiculoId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.inspecciones(vehiculoId),
    queryFn:  () => inspeccionesService.getByVehiculo(vehiculoId),
    enabled:  !!vehiculoId,
  })
}

export function useCrearInspeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      inspeccion, items
    }: {
      inspeccion: Omit<Inspeccion, 'id' | 'created_at'>
      items: Omit<ItemInspeccion, 'id' | 'inspeccion_id'>[]
    }) => inspeccionesService.crear(inspeccion, items),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.inspecciones(vars.inspeccion.vehiculo_id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.vehiculo(vars.inspeccion.vehiculo_id) })
    }
  })
}

export function useFirmarInspeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, vehiculoId, liberado }: { id: string; vehiculoId: string; liberado: boolean }) =>
      inspeccionesService.firmar(id, liberado),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.inspecciones(vars.vehiculoId) })
    }
  })
}
