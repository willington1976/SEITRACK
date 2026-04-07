import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import type { Inspeccion, ItemInspeccion } from '@/core/types'
import { FaseInspeccion } from '@/core/enums'

export const inspeccionesService = {
  async getByVehiculo(vehiculo_id: string): Promise<Inspeccion[]> {
    try {
      const { data, error } = await supabase
        .from('inspecciones')
        .select('*, inspector:usuarios(nombre_completo), items:items_inspeccion(*)')
        .eq('vehiculo_id', vehiculo_id)
        .order('fecha', { ascending: false })
        .limit(50)
      if (error) throw error
      await db.inspecciones.bulkPut(data as Inspeccion[])
      return data as Inspeccion[]
    } catch {
      return db.inspecciones.where('vehiculo_id').equals(vehiculo_id).reverse().limit(50).toArray()
    }
  },

  async getUltimaByFase(vehiculo_id: string, fase: FaseInspeccion): Promise<Inspeccion | null> {
    try {
      const { data } = await supabase
        .from('inspecciones')
        .select('*')
        .eq('vehiculo_id', vehiculo_id)
        .eq('fase', fase)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data as Inspeccion | null
    } catch {
      const items = await db.inspecciones
        .where('[vehiculo_id+fase]').equals([vehiculo_id, fase])
        .reverse()
        .limit(1)
        .toArray()
      return items[0] ?? null
    }
  },

  async crear(
    inspeccion: Omit<Inspeccion, 'id' | 'created_at'>,
    items: Omit<ItemInspeccion, 'id' | 'inspeccion_id'>[]
  ): Promise<string> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const insp: Inspeccion = { ...inspeccion, id, created_at: now }

    // Siempre guardar local primero
    await db.inspecciones.add(insp)

    const itemsConId: ItemInspeccion[] = items.map(i => ({
      ...i,
      id: crypto.randomUUID(),
      inspeccion_id: id,
    }))

    try {
      const { error: e1 } = await supabase.from('inspecciones').insert(insp)
      if (e1) throw e1
      if (itemsConId.length > 0) {
        const { error: e2 } = await supabase.from('items_inspeccion').insert(itemsConId)
        if (e2) throw e2
      }
    } catch {
      // Encolar para sync posterior
      await enqueue({ tabla: 'inspecciones', operacion: 'INSERT', payload: insp })
      for (const item of itemsConId) {
        await enqueue({ tabla: 'items_inspeccion', operacion: 'INSERT', payload: item })
      }
    }

    return id
  },

  async firmar(inspeccion_id: string, liberado: boolean) {
    const update = { id: inspeccion_id, liberado_servicio: liberado, firmado_en: new Date().toISOString() }
    try {
      const { error } = await supabase
        .from('inspecciones').update(update).eq('id', inspeccion_id)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'inspecciones', operacion: 'UPDATE', payload: update })
    }
    await db.inspecciones.update(inspeccion_id, update)
  }
}


// Auto-generar OT + discrepancia si hay críticos con falla
// (llamar después de crear una inspección rechazada)
export async function procesarFallasCriticas(
  vehiculoId: string,
  inspectorId: string,
  fallasCriticas: string[]
): Promise<void> {
  if (fallasCriticas.length === 0) return
  const { mantenimientoService } = await import('./mantenimiento.service')
  await mantenimientoService.crearOTDesdeInspeccion(vehiculoId, inspectorId, fallasCriticas)
}
