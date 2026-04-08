import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import type { Vehiculo } from '@/core/types'

export const vehiculosService = {
  // estacion_id = null → trae todos (jefe nacional)
  // estacion_id = uuid → filtra por estación
  async getByScope(estacion_id: string | null): Promise<Vehiculo[]> {
    try {
      let q = supabase
        .from('vehiculos')
        .select('*, estacion:estaciones(nombre, codigo_iata, ciudad)')
        .order('matricula')

      if (estacion_id) {
        q = q.eq('estacion_id', estacion_id)
      }

      const { data, error } = await q
      if (error) throw error

      await db.vehiculos.bulkPut(data as Vehiculo[])
      return data as Vehiculo[]
    } catch {
      // Fallback local — si es nacional muestra todos los cacheados
      if (!estacion_id) return db.vehiculos.toArray()
      return db.vehiculos.where('estacion_id').equals(estacion_id).toArray()
    }
  },

  // Mantener compatibilidad con código que usa getByEstacion
  async getByEstacion(estacion_id: string): Promise<Vehiculo[]> {
    return vehiculosService.getByScope(estacion_id)
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
