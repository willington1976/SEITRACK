import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vehiculosService } from '@/services/vehiculos.service'
import { useScope } from '@/hooks/useScope'
import { QUERY_KEYS } from '@/lib/constants'

export function useVehiculos(estacionIdOverride?: string | null) {
  const { estacionId } = useScope()
  // Si se pasa override (desde DrilldownEstacion) úsalo, sino usa el scope del usuario
  const filtro = estacionIdOverride !== undefined ? estacionIdOverride : estacionId

  return useQuery({
    queryKey: ['vehiculos', 'scope', filtro ?? 'nacional'],
    queryFn:  () => vehiculosService.getByScope(filtro),
    staleTime: 1000 * 60,
  })
}

export function useVehiculo(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.vehiculo(id),
    queryFn:  () => vehiculosService.getById(id),
    enabled:  !!id,
  })
}

export function useUpdateKilometraje() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, km, horas }: { id: string; km: number; horas: number }) =>
      vehiculosService.updateKilometraje(id, km, horas),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.vehiculo(vars.id) })
      qc.invalidateQueries({ queryKey: ['vehiculos', 'scope'] })
    }
  })
}
