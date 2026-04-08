// ─── Servicio de checklists — lee desde la BD (editables) ────────────────────
import { supabase } from './supabase'
import { getChecklist as getChecklistLocal } from '@/lib/checklists'
import type { FaseInspeccion, ProgramaMTO } from '@/core/enums'

export interface ChecklistItemDB {
  id: string
  sistema: string
  descripcion: string
  critico: boolean
  orden: number
}

export interface ChecklistSistemaDB {
  sistema: string
  items: ChecklistItemDB[]
}

// Caché en memoria para evitar consultas repetidas
const cache = new Map<string, { data: ChecklistSistemaDB[]; ts: number }>()
const CACHE_TTL = 1000 * 60 * 10 // 10 minutos

export async function getChecklistDB(
  fase: FaseInspeccion,
  programa: ProgramaMTO
): Promise<ChecklistSistemaDB[]> {
  const key = `${fase}-${programa}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  try {
    const { data, error } = await supabase.rpc('get_checklist', {
      p_fase:     fase,
      p_programa: programa,
    })

    if (error) throw error
    if (!data || data.length === 0) {
      // Fallback a checklists hardcodeados si BD está vacía
      return convertirAFormatoDBDesdeLocal(fase, programa)
    }

    // Agrupar por sistema
    const grupos: Record<string, ChecklistItemDB[]> = {}
    for (const item of data as ChecklistItemDB[]) {
      if (!grupos[item.sistema]) grupos[item.sistema] = []
      grupos[item.sistema].push(item)
    }

    const result: ChecklistSistemaDB[] = Object.entries(grupos).map(
      ([sistema, items]) => ({ sistema, items: items.sort((a, b) => a.orden - b.orden) })
    )

    cache.set(key, { data: result, ts: Date.now() })
    return result

  } catch {
    // Fallback a checklists locales hardcodeados
    return convertirAFormatoDBDesdeLocal(fase, programa)
  }
}

function convertirAFormatoDBDesdeLocal(
  fase: FaseInspeccion,
  programa: ProgramaMTO
): ChecklistSistemaDB[] {
  const local = getChecklistLocal(fase, programa)
  return local.map(s => ({
    sistema: s.sistema,
    items: s.items.map((item, i) => ({
      id:          item.id,
      sistema:     item.sistema,
      descripcion: item.descripcion,
      critico:     item.critico,
      orden:       i,
    }))
  }))
}

// Invalidar caché cuando un admin edita un ítem
export function invalidarCacheChecklist() {
  cache.clear()
}
