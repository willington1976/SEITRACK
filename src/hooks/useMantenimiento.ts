import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mantenimientoService } from '@/services/mantenimiento.service'
import { useAuthStore } from '@/stores/auth.store'
import { QUERY_KEYS } from '@/lib/constants'

export function useOrdenesAbiertas() {
  const estacionId = useAuthStore(s => s.usuario?.estacion_id)
  return useQuery({
    queryKey: ['ordenes', 'abiertas', estacionId],
    queryFn:  () => mantenimientoService.getOrdenesAbiertas(estacionId!),
    enabled:  !!estacionId,
  })
}

export function useOrdenesByVehiculo(vehiculoId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.ordenes(vehiculoId),
    queryFn:  () => mantenimientoService.getOrdenesByVehiculo(vehiculoId),
    enabled:  !!vehiculoId,
  })
}

export function useCrearOrden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mantenimientoService.crearOrden.bind(mantenimientoService),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

export function useCerrarOrden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, horas }: { id: string; horas: number }) =>
      mantenimientoService.cerrarOrden(id, horas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}
