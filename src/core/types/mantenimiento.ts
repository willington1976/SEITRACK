import type { TipoFalla, Criticidad, EstadoOT } from '../enums'
import type { Vehiculo } from './vehiculo'
import type { Usuario } from './auth'

export interface Discrepancia {
  id: string
  vehiculo_id: string
  reportado_por: string
  sistema_afectado: string
  tipo_falla: TipoFalla
  descripcion: string
  criticidad: Criticidad
  estado: 'abierta' | 'en_proceso' | 'cerrada'
  created_at: string
  cerrado_en?: string
  orden_trabajo?: OrdenTrabajo
}

export interface OrdenTrabajo {
  id: string
  vehiculo_id: string
  creado_por: string
  asignado_a?: string
  discrepancia_id?: string
  numero_ot: string          // ej: OT-2024-001234
  tipo: 'preventivo' | 'correctivo' | 'post_accidente' | 'alteracion'
  prioridad: Criticidad
  estado: EstadoOT
  descripcion: string
  fecha_programada?: string
  fecha_cierre?: string
  horas_labor?: number
  created_at: string
  vehiculo?: Vehiculo
  consumos?: ConsumoRepuesto[]
}

export interface Repuesto {
  id: string
  estacion_id: string
  numero_parte: string
  descripcion: string
  tipo: 'consumible' | 'componente' | 'lubricante' | 'filtro' | 'otro'
  cantidad_stock: number
  stock_minimo: number
  unidad: string
  proveedor?: string
  updated_at: string
}

export interface ConsumoRepuesto {
  id: string
  repuesto_id: string
  orden_trabajo_id: string
  usuario_id: string
  cantidad: number
  fecha: string
  motivo?: string
  repuesto?: Repuesto
}

export interface LibroOperacion {
  id: string
  vehiculo_id: string
  usuario_id: string
  fecha: string
  turno: 'dia' | 'tarde' | 'noche'
  anotacion: string
  tipo_entrada: 'novedad' | 'mantenimiento' | 'operacion' | 'combustible' | 'agente_extintor'
  km_registro: number
  horas_registro: number
  nivel_combustible?: string
  nivel_agente_extintor?: string
  created_at: string
  usuario?: Usuario
}
