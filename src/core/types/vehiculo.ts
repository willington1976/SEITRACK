import type { MarcaVehiculo, ProgramaMTO, EstadoVehiculo } from '../enums'
import type { Estacion } from './auth'

export interface Vehiculo {
  id: string
  estacion_id: string
  matricula: string
  numero_serie: string
  marca: MarcaVehiculo
  modelo: string
  anio: number
  kilometraje_actual: number
  horas_motor: number
  estado: EstadoVehiculo
  fecha_adquisicion: string
  programa_mto: ProgramaMTO
  created_at: string
  estacion?: Estacion
  componentes?: Componente[]
}

export interface Componente {
  id: string
  vehiculo_id: string
  numero_parte: string
  descripcion: string
  numero_serie?: string
  estado: 'apto' | 'en_transito' | 'reparacion' | 'no_reparable'
  fecha_instalacion: string
  vida_util_horas?: number
  horas_acumuladas: number
  updated_at: string
}
