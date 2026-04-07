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
