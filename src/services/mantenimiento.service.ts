import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import type { OrdenTrabajo, Discrepancia } from '@/core/types'
import { Criticidad } from '@/core/enums'

export const mantenimientoService = {
  // ─── Órdenes de trabajo ────────────────────────────────────────────────────

  async getOrdenesByVehiculo(vehiculo_id: string): Promise<OrdenTrabajo[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select('*, vehiculo:vehiculos(matricula,modelo), discrepancia:discrepancias(*)')
        .eq('vehiculo_id', vehiculo_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      await db.ordenes_trabajo.bulkPut(data as OrdenTrabajo[])
      return data as OrdenTrabajo[]
    } catch {
      return db.ordenes_trabajo.where('vehiculo_id').equals(vehiculo_id).reverse().toArray()
    }
  },

  async getOrdenesAbiertas(estacion_id: string): Promise<OrdenTrabajo[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select('*, vehiculo:vehiculos!inner(matricula, modelo, estacion_id)')
        .eq('vehiculo.estacion_id', estacion_id)
        .in('estado', ['abierta', 'en_proceso'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OrdenTrabajo[]
    } catch {
      return db.ordenes_trabajo
        .where('estado').anyOf(['abierta', 'en_proceso'])
        .reverse().toArray()
    }
  },

  async crearOrden(
    ot: Omit<OrdenTrabajo, 'id' | 'numero_ot' | 'created_at'>
  ): Promise<string> {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    // numero_ot lo genera el trigger en PostgreSQL; cliente usa placeholder
    const payload = { ...ot, id, numero_ot: '', created_at: now }

    try {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .insert(payload)
        .select('id, numero_ot')
        .single()
      if (error) throw error
      await db.ordenes_trabajo.put({ ...payload, numero_ot: data.numero_ot })
      return data.id
    } catch {
      await enqueue({ tabla: 'ordenes_trabajo', operacion: 'INSERT', payload })
      await db.ordenes_trabajo.put(payload)
      return id
    }
  },

  async cerrarOrden(id: string, horas_labor: number): Promise<void> {
    const update = { id, estado: 'cerrada', fecha_cierre: new Date().toISOString().split('T')[0], horas_labor }
    try {
      const { error } = await supabase.from('ordenes_trabajo').update(update).eq('id', id)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'ordenes_trabajo', operacion: 'UPDATE', payload: update })
    }
    await db.ordenes_trabajo.update(id, update)
  },

  // ─── Discrepancias ─────────────────────────────────────────────────────────

  async crearDiscrepancia(
    disc: Omit<Discrepancia, 'id' | 'created_at' | 'cerrado_en'>
  ): Promise<string> {
    const id      = crypto.randomUUID()
    const payload = { ...disc, id, created_at: new Date().toISOString() }
    try {
      const { error } = await supabase.from('discrepancias').insert(payload)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'discrepancias', operacion: 'INSERT', payload })
    }
    return id
  },

  async getDiscrepanciasAbiertas(vehiculo_id: string): Promise<Discrepancia[]> {
    try {
      const { data, error } = await supabase
        .from('discrepancias')
        .select('*')
        .eq('vehiculo_id', vehiculo_id)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: false })
      if (error) throw error
      return data as Discrepancia[]
    } catch {
      return []
    }
  },

  // ─── Auto-crear OT desde inspección rechazada ─────────────────────────────

  async crearOTDesdeInspeccion(
    vehiculoId: string,
    inspectorId: string,
    fallasCriticas: string[]
  ): Promise<void> {
    if (fallasCriticas.length === 0) return

    // 1. Crear discrepancia
    const discId = await this.crearDiscrepancia({
      vehiculo_id:     vehiculoId,
      reportado_por:   inspectorId,
      sistema_afectado: 'Múltiples sistemas',
      tipo_falla:      'cronica',
      descripcion:     `Fallas detectadas en inspección:\n${fallasCriticas.map(f => `• ${f}`).join('\n')}`,
      criticidad:      Criticidad.Alta,
      estado:          'abierta',
    })

    // 2. Crear OT ligada a la discrepancia
    await this.crearOrden({
      vehiculo_id:     vehiculoId,
      creado_por:      inspectorId,
      discrepancia_id: discId,
      tipo:            'correctivo',
      prioridad:       Criticidad.Alta,
      estado:          'abierta',
      descripcion:     `Corrección requerida por inspección. Fallas: ${fallasCriticas.join(', ')}`,
    })

    // 3. Marcar vehículo fuera de servicio
    const { error } = await supabase
      .from('vehiculos')
      .update({ estado: 'fuera_de_servicio' })
      .eq('id', vehiculoId)
    if (error) {
      await enqueue({
        tabla: 'vehiculos', operacion: 'UPDATE',
        payload: { id: vehiculoId, estado: 'fuera_de_servicio' }
      })
    }
    await db.vehiculos.update(vehiculoId, { estado: 'fuera_de_servicio' as any })
  },
}
