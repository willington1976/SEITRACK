import Dexie, { type EntityTable } from 'dexie'
import type {
  Regional, Estacion, Vehiculo, Inspeccion,
  OrdenTrabajo, LibroOperacion, Repuesto, SyncItem
} from '@/core/types'

class SEITrackDB extends Dexie {
  regionales!:    EntityTable<Regional,     'id'>
  estaciones!:    EntityTable<Estacion,     'id'>
  vehiculos!:     EntityTable<Vehiculo,     'id'>
  inspecciones!:  EntityTable<Inspeccion,   'id'>
  ordenes_trabajo!: EntityTable<OrdenTrabajo, 'id'>
  libro_operacion!: EntityTable<LibroOperacion, 'id'>
  repuestos!:     EntityTable<Repuesto,     'id'>
  sync_queue!:    EntityTable<SyncItem,     'id'>

  constructor() {
    super('seitrack_v1')

    // v1 — esquema original (sin índice intentos en sync_queue)
    this.version(1).stores({
      regionales:       'id, codigo',
      estaciones:       'id, regional_id, codigo_iata, activa',
      vehiculos:        'id, estacion_id, matricula, estado, marca',
      inspecciones:     'id, vehiculo_id, inspector_id, fase, fecha',
      ordenes_trabajo:  'id, vehiculo_id, estado, tipo, numero_ot',
      libro_operacion:  'id, vehiculo_id, usuario_id, fecha',
      repuestos:        'id, estacion_id, numero_parte',
      sync_queue:       '++id, tabla, operacion, created_at',
    })

    // v2 — agrega índice intentos en sync_queue
    // Dexie migra automáticamente sin borrar datos existentes
    this.version(2).stores({
      regionales:       'id, codigo',
      estaciones:       'id, regional_id, codigo_iata, activa',
      vehiculos:        'id, estacion_id, matricula, estado, marca',
      inspecciones:     'id, vehiculo_id, inspector_id, fase, fecha',
      ordenes_trabajo:  'id, vehiculo_id, estado, tipo, numero_ot',
      libro_operacion:  'id, vehiculo_id, usuario_id, fecha',
      repuestos:        'id, estacion_id, numero_parte',
      sync_queue:       '++id, tabla, operacion, created_at, intentos',
    })
  }
}

export const db = new SEITrackDB()

// Inicializar con datos de referencia (solo si vacío)
export async function initSeedData() {
  const count = await db.regionales.count()
  if (count > 0) return

  await db.regionales.bulkAdd([
    { id: 'reg-norte',      nombre: 'Regional Norte',       codigo: 'RN',  created_at: new Date().toISOString() },
    { id: 'reg-noroccidente', nombre: 'Regional Noroccidente', codigo: 'RNO', created_at: new Date().toISOString() },
    { id: 'reg-centrosur', nombre: 'Regional Centro Sur',   codigo: 'RCS', created_at: new Date().toISOString() },
    { id: 'reg-oriente',   nombre: 'Regional Oriente',      codigo: 'ROR', created_at: new Date().toISOString() },
    { id: 'reg-nororiente', nombre: 'Regional Nororiente',  codigo: 'RNR', created_at: new Date().toISOString() },
    { id: 'reg-occidente', nombre: 'Regional Occidente',    codigo: 'ROC', created_at: new Date().toISOString() },
  ])
}
