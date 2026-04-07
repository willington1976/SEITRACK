import { db } from './dexie'
import { supabase } from '@/services/supabase'
import type { SyncItem } from '@/core/types'

const MAX_INTENTOS = 5

export async function enqueue(item: Omit<SyncItem, 'id' | 'intentos' | 'created_at'>) {
  await db.sync_queue.add({
    ...item,
    intentos: 0,
    created_at: Date.now(),
  })
}

export async function flushQueue(onProgress?: (done: number, total: number) => void) {
  const pending = await db.sync_queue
    .where('intentos').below(MAX_INTENTOS)
    .sortBy('created_at')

  let done = 0
  for (const item of pending) {
    try {
      await processSyncItem(item)
      await db.sync_queue.delete(item.id!)
    } catch (err) {
      await db.sync_queue.update(item.id!, {
        intentos: item.intentos + 1,
        error: String(err),
      })
    }
    onProgress?.(++done, pending.length)
  }
}

async function processSyncItem(item: SyncItem) {
  const { tabla, operacion, payload } = item

  if (operacion === 'INSERT') {
    const { error } = await supabase.from(tabla).insert(payload)
    if (error) throw error
  } else if (operacion === 'UPDATE') {
    const { id, ...data } = payload
    const { error } = await supabase.from(tabla).update(data).eq('id', id)
    if (error) throw error
  } else if (operacion === 'DELETE') {
    const { error } = await supabase.from(tabla).delete().eq('id', payload.id)
    if (error) throw error
  }
}

export async function getPendingCount() {
  return db.sync_queue.where('intentos').below(MAX_INTENTOS).count()
}

export async function getFailedItems() {
  return db.sync_queue.where('intentos').aboveOrEqual(MAX_INTENTOS).toArray()
}
