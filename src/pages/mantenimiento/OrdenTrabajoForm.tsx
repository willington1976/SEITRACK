import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCrearOrden, useCerrarOrden, useOrdenesByVehiculo } from '@/hooks/useMantenimiento'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Criticidad } from '@/core/enums'

export default function OrdenTrabajoForm() {
  const { otId } = useParams<{ otId?: string }>()
  const navigate  = useNavigate()
  const usuario   = useAuthStore(s => s.usuario)
  const { data: vehiculos } = useVehiculos()
  const { mutateAsync: crear, isPending } = useCrearOrden()

  const [form, setForm] = useState({
    vehiculo_id:      '',
    tipo:             'correctivo' as 'preventivo' | 'correctivo' | 'post_accidente' | 'alteracion',
    prioridad:        Criticidad.Media,
    descripcion:      '',
    fecha_programada: '',
  })
  const [error, setError] = useState('')

  function setField(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehiculo_id || !form.descripcion.trim()) {
      setError('Selecciona un vehículo y agrega una descripción')
      return
    }
    setError('')
    try {
      await crear({
        vehiculo_id:     form.vehiculo_id,
        creado_por:      usuario!.id,
        tipo:            form.tipo,
        prioridad:       form.prioridad,
        estado:          'abierta',
        descripcion:     form.descripcion,
        fecha_programada: form.fecha_programada || undefined,
      } as any)
      navigate('/mantenimiento')
    } catch {
      setError('Error al crear la OT. Quedará en cola para sincronizar.')
      navigate('/mantenimiento')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Nueva orden de trabajo</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehículo */}
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Vehículo *</label>
            <select
              value={form.vehiculo_id}
              onChange={e => setField('vehiculo_id', e.target.value)}
              required
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sei-400"
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos?.map(v => (
                <option key={v.id} value={v.id}>{v.matricula} — {v.modelo}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo */}
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setField('tipo', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sei-400"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="post_accidente">Post accidente</option>
                <option value="alteracion">Alteración</option>
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={e => setField('prioridad', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sei-400"
              >
                <option value={Criticidad.Alta}>Alta</option>
                <option value={Criticidad.Media}>Media</option>
                <option value={Criticidad.Baja}>Baja</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Descripción del trabajo *</label>
            <textarea
              rows={4}
              value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
              placeholder="Describe el trabajo a realizar..."
              required
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sei-400 resize-none"
            />
          </div>

          {/* Fecha programada */}
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Fecha programada</label>
            <input
              type="date"
              value={form.fecha_programada}
              onChange={e => setField('fecha_programada', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sei-400"
            />
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold hover:bg-sei-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creando...' : 'Crear OT'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
