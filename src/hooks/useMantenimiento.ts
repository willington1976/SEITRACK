import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mantenimientoService } from '@/services/mantenimiento.service'
import { useScope } from '@/hooks/useScope'
import { QUERY_KEYS } from '@/lib/constants'

export function useOrdenesAbiertas(estacionIdOverride?: string | null) {
  const { estacionId } = useScope()
  const filtro = estacionIdOverride !== undefined ? estacionIdOverride : estacionId

  return useQuery({
    queryKey: ['ordenes', 'abiertas', filtro ?? 'nacional'],
    queryFn:  () => mantenimientoService.getOrdenesAbiertas(filtro),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
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
