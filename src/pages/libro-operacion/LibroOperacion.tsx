import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/utils'
import { TURNO_LABELS } from '@/lib/constants'
import type { LibroOperacion as TLibro } from '@/core/types'

const tipoLabel: Record<string, { l: string; v: 'default' | 'success' | 'warning' | 'info' | 'muted' }> = {
  novedad:        { l: 'Novedad',        v: 'warning' },
  mantenimiento:  { l: 'Mantenimiento',  v: 'info' },
  operacion:      { l: 'Operación',      v: 'default' },
  combustible:    { l: 'Combustible',    v: 'success' },
  agente_extintor:{ l: 'Agente extintor',v: 'muted' },
}

function useLibro(vehiculoId: string) {
  return useQuery({
    queryKey: ['libro', vehiculoId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('libro_operacion')
          .select('*, usuario:usuarios(nombre_completo)')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        await db.libro_operacion.bulkPut(data as TLibro[])
        return data as TLibro[]
      } catch {
        return db.libro_operacion.where('vehiculo_id').equals(vehiculoId).reverse().limit(100).toArray()
      }
    },
    enabled: !!vehiculoId,
  })
}

export default function LibroOperacion() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { data: vehiculo }  = useVehiculo(vehiculoId!)
  const { data: entradas, isLoading } = useLibro(vehiculoId!)
  const usuario  = useAuthStore(s => s.usuario)
  const qc       = useQueryClient()

  const [form, setForm] = useState({
    tipo:                 'operacion',
    turno:                'dia',
    anotacion:            '',
    km_registro:          '',
    horas_registro:       '',
    nivel_combustible:    '',
    nivel_agente_extintor:'',
  })
  const [guardando, setGuardando] = useState(false)

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.anotacion.trim() || !usuario || !vehiculoId) return
    setGuardando(true)

    const entrada: TLibro = {
      id:                    crypto.randomUUID(),
      vehiculo_id:           vehiculoId,
      usuario_id:            usuario.id,
      fecha:                 new Date().toISOString().split('T')[0],
      turno:                 form.turno as TLibro['turno'],
      anotacion:             form.anotacion,
      tipo_entrada:          form.tipo as TLibro['tipo_entrada'],
      km_registro:           Number(form.km_registro) || vehiculo?.kilometraje_actual || 0,
      horas_registro:        Number(form.horas_registro) || vehiculo?.horas_motor || 0,
      nivel_combustible:     form.nivel_combustible || undefined,
      nivel_agente_extintor: form.nivel_agente_extintor || undefined,
      created_at:            new Date().toISOString(),
    }

    await db.libro_operacion.add(entrada)
    try {
      const { error } = await supabase.from('libro_operacion').insert(entrada)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'libro_operacion', operacion: 'INSERT', payload: entrada })
    }

    setForm({ tipo: 'operacion', turno: 'dia', anotacion: '', km_registro: '', horas_registro: '', nivel_combustible: '', nivel_agente_extintor: '' })
    qc.invalidateQueries({ queryKey: ['libro', vehiculoId] })
    setGuardando(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">
          Libro de operación — {vehiculo?.matricula ?? '…'}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{entradas?.length ?? 0} entradas</p>
      </div>

      {/* Formulario nueva entrada */}
      <Card>
        <CardHeader title="Nueva anotación" />
        <form onSubmit={handleGuardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
              >
                {Object.entries(tipoLabel).map(([v, { l }]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Turno</label>
              <select
                value={form.turno}
                onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
              >
                {Object.entries(TURNO_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l.split(' ')[0]}</option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            placeholder="Descripción de la novedad u operación..."
            value={form.anotacion}
            onChange={e => setForm(p => ({ ...p, anotacion: e.target.value }))}
            required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400 resize-none"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: 'km_registro',      ph: `Km (${vehiculo?.kilometraje_actual ?? 0})`, label: 'Km' },
              { k: 'horas_registro',   ph: `Horas (${vehiculo?.horas_motor ?? 0})`,    label: 'Horas motor' },
              { k: 'nivel_combustible',     ph: 'Ej: 3/4',    label: 'Combustible' },
              { k: 'nivel_agente_extintor', ph: 'Ej: 100%',   label: 'Agente ext.' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-[11px] text-gray-400 mb-0.5">{f.label}</label>
                <input
                  type={f.k.includes('km') || f.k.includes('horas') ? 'number' : 'text'}
                  placeholder={f.ph}
                  value={(form as any)[f.k]}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={guardando || !form.anotacion.trim()}
            className="w-full py-2.5 bg-sei-600 text-white text-sm font-semibold rounded-xl hover:bg-sei-700 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Registrar entrada'}
          </button>
        </form>
      </Card>

      {/* Listado */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {entradas?.map(e => {
            const tl = tipoLabel[e.tipo_entrada] ?? { l: e.tipo_entrada, v: 'muted' as const }
            const autorNombre = (e.usuario as { nombre_completo: string } | undefined)?.nombre_completo
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <Badge variant={tl.v}>{tl.l}</Badge>
                  <span className="text-[11px] text-gray-400">{formatDateTime(e.created_at)}</span>
                </div>
                <p className="text-sm text-gray-800">{e.anotacion}</p>
                <div className="flex gap-3 mt-2 text-[11px] text-gray-400">
                  {e.km_registro > 0 && <span>{e.km_registro.toLocaleString('es-CO')} km</span>}
                  {e.horas_registro > 0 && <span>{e.horas_registro.toLocaleString('es-CO')} h</span>}
                  {e.nivel_combustible && <span>Comb: {e.nivel_combustible}</span>}
                  {e.nivel_agente_extintor && <span>Agente: {e.nivel_agente_extintor}</span>}
                  {autorNombre && <span>· {autorNombre.split(' ')[0]}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
