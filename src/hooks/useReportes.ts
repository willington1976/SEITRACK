import { useQuery } from '@tanstack/react-query'
import { reportesService } from '@/services/reportes.service'
import { useAuthStore } from '@/stores/auth.store'
import { format, subDays } from 'date-fns'

export function useNacionalStats() {
  return useQuery({
    queryKey: ['dashboard', 'nacional'],
    queryFn:  () => reportesService.getNacional(),
    staleTime: 1000 * 60 * 2, // 2 min
  })
}

export function useRegionalStats(regionalId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'regional', regionalId],
    queryFn:  () => reportesService.getRegional(regionalId!),
    enabled:  !!regionalId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useKPIsEstacion() {
  const estacionId = useAuthStore(s => s.usuario?.estacion_id)
  return useQuery({
    queryKey: ['kpis', 'estacion', estacionId],
    queryFn:  () => reportesService.getKPIsEstacion(estacionId!),
    enabled:  !!estacionId,
    staleTime: 1000 * 30,       // 30 seg — datos operativos en tiempo casi real
    refetchInterval: 1000 * 60, // refresca cada minuto
  })
}

export function useAVC(params: {
  desde: string
  hasta: string
  regionalId?: string
}) {
  return useQuery({
    queryKey: ['avc', params.desde, params.hasta, params.regionalId],
    queryFn:  () => reportesService.getAVC(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFallasPorSistema(estacionId?: string) {
  const desde = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const hasta  = format(new Date(), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['fallas-sistema', estacionId, desde, hasta],
    queryFn:  () => reportesService.getFallasPorSistema({ desde, hasta, estacionId }),
    staleTime: 1000 * 60 * 5,
  })
}
