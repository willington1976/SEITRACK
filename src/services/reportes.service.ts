import { supabase } from './supabase'

export interface RegionalStats {
  id: string; nombre: string; codigo: string
  total_estaciones: number; total_vehiculos: number
  operativos: number; en_manto: number; fuera_servicio: number
  inspecciones_hoy: number; ots_abiertas: number
}

export interface EstacionStats {
  id: string; nombre: string; codigo_iata: string
  aeropuerto: string; ciudad: string; categoria_icao: string
  total_vehiculos: number; operativos: number
  en_manto: number; fuera_servicio: number
  ultima_inspeccion: string | null; ots_abiertas: number
}

export interface AVCRow {
  estacion_nombre: string; regional_nombre: string
  vehiculo_matricula: string; vehiculo_modelo: string; programa_mto: string
  total_inspecciones: number; insp_aprobadas: number
  insp_observaciones: number; insp_rechazadas: number
  total_fallas: number; fallas_criticas: number
  ots_generadas: number; ots_cerradas: number
  tasa_disponibilidad: number
}

export interface FallaSistema {
  sistema: string
  total_fallas: number
  fallas_criticas: number
}

export interface KPIsEstacion {
  vehiculos_operativos: number; vehiculos_total: number
  inspecciones_hoy: number; inspecciones_semana: number
  ots_abiertas: number; ots_alta_prioridad: number
  stock_bajo: number; ultima_inspeccion: string | null
}

export const reportesService = {
  async getNacional(): Promise<RegionalStats[]> {
    const { data, error } = await supabase.rpc('dashboard_nacional')
    if (error) throw error
    return data ?? []
  },

  async getRegional(regionalId: string): Promise<EstacionStats[]> {
    const { data, error } = await supabase.rpc('dashboard_regional', {
      p_regional_id: regionalId
    })
    if (error) throw error
    return data ?? []
  },

  async getAVC(params: {
    desde: string; hasta: string; regionalId?: string
  }): Promise<AVCRow[]> {
    const { data, error } = await supabase.rpc('reporte_avc', {
      p_desde:       params.desde,
      p_hasta:       params.hasta,
      p_regional_id: params.regionalId ?? null,
    })
    if (error) throw error
    return data ?? []
  },

  async getFallasPorSistema(params: {
    desde: string; hasta: string; estacionId?: string
  }): Promise<FallaSistema[]> {
    const { data, error } = await supabase.rpc('fallas_por_sistema', {
      p_desde:       params.desde,
      p_hasta:       params.hasta,
      p_estacion_id: params.estacionId ?? null,
    })
    if (error) throw error
    return data ?? []
  },

  async getKPIsEstacion(estacionId: string): Promise<KPIsEstacion | null> {
    const { data, error } = await supabase.rpc('kpis_estacion', {
      p_estacion_id: estacionId
    })
    if (error) throw error
    return data?.[0] ?? null
  },
}
