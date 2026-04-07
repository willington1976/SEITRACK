import { supabase } from './supabase'
import { db, } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import type { Vehiculo } from '@/core/types'

export const vehiculosService = {
  async getByEstacion(estacion_id: string): Promise<Vehiculo[]> {
    // Intenta red primero, cae a cache local
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*, estacion:estaciones(nombre, codigo_iata)')
        .eq('estacion_id', estacion_id)
        .order('matricula')

      if (error) throw error

      // Actualizar cache local
      await db.vehiculos.bulkPut(data as Vehiculo[])
      return data as Vehiculo[]
    } catch {
      // Fallback a IndexedDB
      return db.vehiculos.where('estacion_id').equals(estacion_id).toArray()
    }
  },

  async getById(id: string): Promise<Vehiculo | null> {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*, componentes(*), estacion:estaciones(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      await db.vehiculos.put(data as Vehiculo)
      return data as Vehiculo
    } catch {
      return db.vehiculos.get(id) ?? null
    }
  },

  async updateKilometraje(id: string, km: number, horas: number) {
    const payload = { id, kilometraje_actual: km, horas_motor: horas }
    try {
      const { error } = await supabase
        .from('vehiculos').update(payload).eq('id', id)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'vehiculos', operacion: 'UPDATE', payload })
    }
    await db.vehiculos.update(id, { kilometraje_actual: km, horas_motor: horas })
  }
}
