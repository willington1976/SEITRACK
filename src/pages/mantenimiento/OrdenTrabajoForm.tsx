import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useCrearOrden } from '@/hooks/useMantenimiento'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Criticidad, EstadoOT, Rol } from '@/core/enums'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { OrdenTrabajo } from '@/core/types'

// ─── Constantes visuales ──────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  preventivo:     'Preventivo',
  correctivo:     'Correctivo',
  post_accidente: 'Post accidente',
  alteracion:     'Alteración',
}

const PRIORIDAD_BADGE: Record<string, 'danger'|'warning'|'muted'> = {
  alta:  'danger',
  media: 'warning',
  baja:  'muted',
}

const ESTADO_BADGE: Record<string, 'danger'|'warning'|'success'|'muted'> = {
  abierta:    'danger',
  en_proceso: 'warning',
  cerrada:    'success',
  cancelada:  'muted',
}

const ESTADO_LABELS: Record<string, string> = {
  abierta:    'Abierta',
  en_proceso: 'En proceso',
  cerrada:    'Cerrada',
  cancelada:  'Cancelada',
}

// ─── Hook: cargar OT por ID ───────────────────────────────────────────────────

function useOrdenTrabajo(id: string | undefined) {
  return useQuery({
    queryKey: ['orden_trabajo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          *,
          vehiculo:vehiculos(matricula, modelo, anio),
          creado_por_usuario:usuarios!ordenes_trabajo_creado_por_fkey(nombre_completo),
          asignado_usuario:usuarios!ordenes_trabajo_asignado_a_fkey(nombre_completo)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as OrdenTrabajo & {
        vehiculo: { matricula: string; modelo: string; anio: number }
        creado_por_usuario: { nombre_completo: string }
        asignado_usuario: { nombre_completo: string } | null
      }
    },
    enabled: !!id,
  })
}

// ─── Vista detalle de OT existente ───────────────────────────────────────────

function OrdenTrabajoDetalle({ otId }: { otId: string }) {
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const usuario    = useAuthStore(s => s.usuario)
  const { data: ot, isLoading } = useOrdenTrabajo(otId)

  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [horasLabor,    setHorasLabor]    = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [nuevoEstado,   setNuevoEstado]   = useState<'en_proceso'|'cerrada'>('en_proceso')
  const [cerrando,      setCerrando]      = useState(false)

  const puedeGestionar = usuario?.rol === Rol.JefeEstacion
    || usuario?.rol === Rol.JefeRegional
    || usuario?.rol === Rol.JefeNacional
    || (ot?.asignado_a === usuario?.id)

  async function handleActualizar() {
    if (!ot) return
    setCerrando(true)
    try {
      const update: Record<string, unknown> = { estado: nuevoEstado }
      if (nuevoEstado === 'cerrada') {
        update.fecha_cierre  = new Date().toISOString().split('T')[0]
        update.horas_labor   = Number(horasLabor) || null
      }

      const { error } = await supabase
        .from('ordenes_trabajo')
        .update(update)
        .eq('id', ot.id)

      if (error) throw error

      // Si se cierra, restaurar vehículo a operativo
      if (nuevoEstado === 'cerrada' && ot.vehiculo_id) {
        await supabase
          .from('vehiculos')
          .update({ estado: 'operativo' })
          .eq('id', ot.vehiculo_id)
          .eq('estado', 'en_mantenimiento')
      }

      qc.invalidateQueries({ queryKey: ['orden_trabajo', otId] })
      qc.invalidateQueries({ queryKey: ['ordenes'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      setMostrarCierre(false)
    } catch (e) {
      console.error(e)
    } finally {
      setCerrando(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>
  if (!ot) return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-sm">Orden de trabajo no encontrada</p>
      <button onClick={() => navigate(-1)} className="mt-2 text-sei-600 text-sm hover:underline">
        Volver
      </button>
    </div>
  )

  const esCerrada = ot.estado === 'cerrada' || ot.estado === 'cancelada'

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 font-mono">
              {ot.numero_ot || 'OT sin número'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Orden de trabajo</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={PRIORIDAD_BADGE[ot.prioridad] ?? 'muted'}>
            {ot.prioridad}
          </Badge>
          <Badge variant={ESTADO_BADGE[ot.estado] ?? 'muted'}>
            {ESTADO_LABELS[ot.estado] ?? ot.estado}
          </Badge>
        </div>
      </div>

      {/* Datos principales */}
      <Card>
        <CardHeader title="Detalle de la orden"/>
        <div className="space-y-3 text-sm">
          {/* Descripción */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Descripción del trabajo</p>
            <p className="text-gray-800 leading-relaxed">{ot.descripcion}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Tipo',       TIPO_LABELS[ot.tipo] ?? ot.tipo],
              ['Prioridad',  ot.prioridad],
              ['Vehículo',   (ot.vehiculo as any)?.matricula ?? '—'],
              ['Modelo',     (ot.vehiculo as any)?.modelo ?? '—'],
              ['Creado por', (ot.creado_por_usuario as any)?.nombre_completo ?? '—'],
              ['Asignado a', (ot.asignado_usuario as any)?.nombre_completo ?? 'Sin asignar'],
              ['Fecha programada', ot.fecha_programada ? formatDate(ot.fecha_programada) : '—'],
              ['Creada el',  formatDateTime(ot.created_at)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Datos de cierre si está cerrada */}
          {esCerrada && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-green-700">Datos de cierre</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Fecha cierre</p>
                  <p className="font-medium text-gray-800">
                    {ot.fecha_cierre ? formatDate(ot.fecha_cierre) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Horas de labor</p>
                  <p className="font-medium text-gray-800">
                    {ot.horas_labor ? `${ot.horas_labor} h` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Panel de gestión — solo si puede gestionar y no está cerrada */}
      {puedeGestionar && !esCerrada && (
        <Card>
          <CardHeader
            title="Gestionar OT"
            subtitle="Actualizar estado o cerrar la orden"
          />

          {!mostrarCierre ? (
            <div className="flex gap-2">
              {ot.estado === 'abierta' && (
                <button
                  onClick={async () => {
                    await supabase
                      .from('ordenes_trabajo')
                      .update({ estado: 'en_proceso' })
                      .eq('id', ot.id)
                    qc.invalidateQueries({ queryKey: ['orden_trabajo', otId] })
                    qc.invalidateQueries({ queryKey: ['ordenes'] })
                  }}
                  className="flex-1 py-2.5 border border-amber-300 text-amber-700 bg-amber-50
                             rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Marcar en proceso
                </button>
              )}
              <button
                onClick={() => setMostrarCierre(true)}
                className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm
                           font-semibold hover:bg-sei-700 transition-colors"
              >
                Cerrar OT
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Estado final
                </label>
                <div className="flex gap-2">
                  {(['cerrada', 'cancelada'] as const).map(est => (
                    <label
                      key={est}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border
                                  cursor-pointer transition-colors text-sm ${
                        nuevoEstado === est
                          ? 'border-sei-400 bg-sei-50 text-sei-800'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="estado_cierre"
                        value={est}
                        checked={nuevoEstado === est}
                        onChange={() => setNuevoEstado(est as 'en_proceso'|'cerrada')}
                        className="accent-sei-600"
                      />
                      {ESTADO_LABELS[est]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Horas de labor
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ej: 4.5"
                  value={horasLabor}
                  onChange={e => setHorasLabor(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sei-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Observaciones de cierre
                </label>
                <textarea
                  rows={3}
                  placeholder="Trabajo realizado, materiales usados, recomendaciones..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sei-400 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarCierre(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                             text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActualizar}
                  disabled={cerrando}
                  className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm
                             font-semibold hover:bg-sei-700 disabled:opacity-50 transition-colors"
                >
                  {cerrando ? 'Guardando...' : 'Confirmar cierre'}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ─── Formulario nueva OT ─────────────────────────────────────────────────────

function NuevaOrdenTrabajo() {
  const navigate  = useNavigate()
  const usuario   = useAuthStore(s => s.usuario)
  const { data: vehiculos } = useVehiculos()
  const { mutateAsync: crear, isPending } = useCrearOrden()

  const [form, setForm] = useState({
    vehiculo_id:      '',
    tipo:             'correctivo' as 'preventivo'|'correctivo'|'post_accidente'|'alteracion',
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
        vehiculo_id:      form.vehiculo_id,
        creado_por:       usuario!.id,
        tipo:             form.tipo,
        prioridad:        form.prioridad,
        estado:           'abierta',
        descripcion:      form.descripcion,
        fecha_programada: form.fecha_programada || undefined,
      } as any)
      navigate('/mantenimiento')
    } catch {
      setError('Error al crear la OT. Quedará en cola para sincronizar.')
      navigate('/mantenimiento')
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Nueva orden de trabajo</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Vehículo *</label>
            <select value={form.vehiculo_id} onChange={e => setField('vehiculo_id', e.target.value)}
              required className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                                  focus:outline-none focus:ring-1 focus:ring-sei-400 bg-white">
              <option value="">Seleccionar vehículo...</option>
              {vehiculos?.map(v => (
                <option key={v.id} value={v.id}>{v.matricula} — {v.modelo}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setField('tipo', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                           focus:outline-none focus:ring-1 focus:ring-sei-400 bg-white">
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="post_accidente">Post accidente</option>
                <option value="alteracion">Alteración</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setField('prioridad', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                           focus:outline-none focus:ring-1 focus:ring-sei-400 bg-white">
                <option value={Criticidad.Alta}>Alta</option>
                <option value={Criticidad.Media}>Media</option>
                <option value={Criticidad.Baja}>Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">
              Descripción del trabajo *
            </label>
            <textarea rows={4} value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
              placeholder="Describe el trabajo a realizar..." required
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                         focus:outline-none focus:ring-1 focus:ring-sei-400 resize-none"/>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">
              Fecha programada
            </label>
            <input type="date" value={form.fecha_programada}
              onChange={e => setField('fecha_programada', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                         focus:outline-none focus:ring-1 focus:ring-sei-400"/>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm text-amber-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                         text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm
                         font-semibold hover:bg-sei-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Creando...' : 'Crear OT'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Componente principal — detecta si es nueva o existente ──────────────────

export default function OrdenTrabajoForm() {
  const { otId } = useParams<{ otId?: string }>()
  return otId ? <OrdenTrabajoDetalle otId={otId} /> : <NuevaOrdenTrabajo />
}
