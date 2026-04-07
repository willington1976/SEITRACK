import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vehiculosService } from '@/services/vehiculos.service'
import { useAuthStore } from '@/stores/auth.store'
import { QUERY_KEYS } from '@/lib/constants'

export function useVehiculos() {
  const estacionId = useAuthStore(s => s.usuario?.estacion_id)
  return useQuery({
    queryKey: QUERY_KEYS.vehiculos(estacionId ?? ''),
    queryFn:  () => vehiculosService.getByEstacion(estacionId!),
    enabled:  !!estacionId,
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
    }
  })
}
