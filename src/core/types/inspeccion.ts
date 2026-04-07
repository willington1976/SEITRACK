import type { FaseInspeccion, ResultadoItem } from '../enums'
import type { Vehiculo } from './vehiculo'
import type { Usuario } from './auth'

export interface Inspeccion {
  id: string
  vehiculo_id: string
  inspector_id: string
  fase: FaseInspeccion
  fecha: string
  turno: 'dia' | 'tarde' | 'noche'
  km_al_momento: number
  horas_al_momento: number
  resultado: 'aprobado' | 'con_observaciones' | 'rechazado'
  observaciones?: string
  liberado_servicio: boolean
  firmado_en?: string
  created_at: string
  vehiculo?: Vehiculo
  inspector?: Usuario
  items?: ItemInspeccion[]
}

export interface ItemInspeccion {
  id: string
  inspeccion_id: string
  sistema: string            // ej: "Motor", "Sistema extinción", "Frenos"
  descripcion_item: string
  resultado: ResultadoItem
  observacion?: string
  requiere_accion: boolean
}
