import type {
  Rol, FaseInspeccion, EstadoVehiculo, EstadoOT,
  TipoFalla, Criticidad, MarcaVehiculo, ProgramaMTO, ResultadoItem
} from '../enums'

// ─── Territorio ─────────────────────────────────────────────────────────────

export interface Regional {
  id: string
  nombre: string
  codigo: string
  created_at: string
}

export interface Estacion {
  id: string
  regional_id: string
  nombre: string
  codigo_iata: string
  aeropuerto: string
  ciudad: string
  departamento: string
  categoria_icao: string   // CAT I, II, III, IV, V, VI, VII, VIII, IX, X
  activa: boolean
  created_at: string
  regional?: Regional
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string
  estacion_id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol: Rol
  numero_certificado?: string
  certificado_vigencia?: string
  activo: boolean
  created_at: string
  estacion?: Estacion
}

// ─── Flota ───────────────────────────────────────────────────────────────────

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

// ─── Inspecciones ────────────────────────────────────────────────────────────

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

// ─── Mantenimiento ───────────────────────────────────────────────────────────

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

// ─── Libro de operación ──────────────────────────────────────────────────────

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

// ─── Almacén ─────────────────────────────────────────────────────────────────

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

// ─── Sync queue (offline) ────────────────────────────────────────────────────

export interface SyncItem {
  id?: number           // autoincrement local
  tabla: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
  intentos: number
  created_at: number    // Date.now()
  error?: string
}
