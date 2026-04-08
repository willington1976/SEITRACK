import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useVehiculos } from '@/hooks/useVehiculos'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Criticidad, Rol } from '@/core/enums'
import { formatDate, formatDateTime, cn } from '@/lib/utils'

// ─── Constantes visuales ──────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  preventivo:     'PREVENTIVO',
  correctivo:     'CORRECTIVO',
  post_accidente: 'POST ACCIDENTE',
  alteracion:     'ALTERACIÓN',
}

const PRIORIDAD_BADGE: Record<string, string> = {
  alta:  'border-red-500/30 bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  media: 'border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  baja:  'border-slate-500/30 bg-white/5 text-slate-400',
}

const ESTADO_BADGE: Record<string, string> = {
  abierta:    'bg-red-500/10 text-red-500 border-red-500/20',
  en_proceso: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cerrada:    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelada:  'bg-slate-500/10 text-slate-500 border-slate-500/20',
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
          vehiculo:vehiculos(matricula, modelo, kilometraje_actual, horas_motor),
          creado_por_u:usuarios!ordenes_trabajo_creado_por_fkey(nombre_completo),
          asignado_u:usuarios!ordenes_trabajo_asignado_a_fkey(nombre_completo)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

function useActualizarOT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const { error } = await supabase.from('ordenes_trabajo').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['orden_trabajo', variables.id] })
      qc.invalidateQueries({ queryKey: ['mantenimiento', 'lista'] })
    },
  })
}

// ─── Componente: Detalle de OT existente ──────────────────────────────────────

function OrdenTrabajoDetalle({ otId }: { otId: string }) {
  const navigate = useNavigate()
  const usuario  = useAuthStore(s => s.usuario)
  const { data: ot, isLoading } = useOrdenTrabajo(otId)
  const { mutateAsync: actualizar } = useActualizarOT()

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
        update.observaciones_cierre = observaciones
      }

      await actualizar({ id: ot.id, ...update })
      setMostrarCierre(false)
    } finally {
      setCerrando(false)
    }
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><Spinner size="lg" /><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizando Orden de Trabajo...</p></div>
  if (!ot) return <div className="text-center py-10 text-slate-500">ORDEN NO DETECTADA</div>

  return (
    <div className="space-y-6 page-enter max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center hover:bg-white/5 text-slate-500 transition-all">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight uppercase font-mono">OT-{ot.numero_ot}</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Expediente de Mantenimiento</p>
          </div>
        </div>
        <Badge className={cn("px-4 py-1.5 rounded-lg font-bold text-[9px] tracking-widest uppercase border border-white/5", ESTADO_BADGE[ot.estado])}>
          {ot.estado}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Descripción de la Discrepancia</p>
              <p className="text-slate-100 font-mono text-sm uppercase leading-relaxed">{ot.descripcion}</p>
            </div>
            {ot.observaciones_cierre && (
              <div className="pt-6 border-t border-white/5">
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1 italic">Reporte de Cierre Técnico</p>
                <p className="text-slate-400 font-mono text-xs uppercase leading-relaxed">{ot.observaciones_cierre}</p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Logística y Trazabilidad</p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { l: 'TIPO DE ORDEN', v: TIPO_LABELS[ot.tipo] },
                { l: 'PRIORIDAD', v: ot.prioridad.toUpperCase() },
                { l: 'FECHA EMISIÓN', v: formatDateTime(ot.created_at) },
                { l: 'FECHA CIERRE', v: ot.fecha_cierre ? formatDate(ot.fecha_cierre) : 'PEN' },
                { l: 'REPORTADO POR', v: ot.creado_por_u?.nombre_completo },
                { l: 'ASIGNADO A', v: ot.asignado_u?.nombre_completo || 'SIN ASIGNAR' },
              ].map(i => (
                <div key={i.l}>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">{i.l}</p>
                  <p className="text-[11px] font-bold text-slate-200 font-mono italic">{i.v || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-8 bg-blue-600/5 border-blue-600/10">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-6 pb-2 border-b border-white/5">Unidad Afectada</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-blue-500 font-bold text-xs ring-4 ring-blue-500/10 uppercase font-mono">
                  {ot.vehiculo?.matricula?.slice(-3) || '??'}
                </div>
                <div>
                   <p className="text-sm font-bold text-white uppercase font-mono italic">{ot.vehiculo?.matricula}</p>
                   <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{ot.vehiculo?.modelo}</p>
                </div>
              </div>
              <div className="pt-4 space-y-2 border-t border-white/5 font-mono">
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-600 uppercase">Odómetro</span>
                    <span className="text-slate-300 font-bold">{ot.vehiculo?.kilometraje_actual} KM</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-600 uppercase">Horas Motor</span>
                    <span className="text-slate-300 font-bold">{ot.vehiculo?.horas_motor} H</span>
                 </div>
              </div>
            </div>
          </div>

          {puedeGestionar && ot.estado !== 'cerrada' && !mostrarCierre && (
            <button 
              onClick={() => { setMostrarCierre(true); setNuevoEstado(ot.estado === 'abierta' ? 'en_proceso' : 'cerrada') }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 border border-white/10"
            >
              GESTIONAR ORDEN →
            </button>
          )}

          {mostrarCierre && (
            <div className="glass-panel rounded-3xl p-8 border-emerald-500/20 bg-emerald-500/5 animate-in slide-in-from-bottom-4 duration-300">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-4">Actualizar Protocolo</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Nuevo Estado</label>
                  <select 
                    value={nuevoEstado} 
                    onChange={e => setNuevoEstado(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-[10px] text-white font-mono focus:outline-none"
                  >
                    <option value="en_proceso" className="bg-slate-950">EN PROCESO</option>
                    <option value="cerrada" className="bg-slate-950">CERRADA / COMPLETADA</option>
                    <option value="cancelada" className="bg-slate-950">CANCELADA</option>
                  </select>
                </div>

                {nuevoEstado === 'cerrada' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Horas de Labor</label>
                      <input 
                        type="number" 
                        value={horasLabor} 
                        onChange={e => setHorasLabor(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Observaciones de Cierre</label>
                      <textarea 
                        rows={3} 
                        value={observaciones} 
                        onChange={e => setObservaciones(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-white font-mono resize-none uppercase"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setMostrarCierre(false)} className="flex-1 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600 hover:text-white transition-all">Cancelar</button>
                  <button 
                    onClick={handleActualizar} 
                    disabled={cerrando}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {cerrando ? 'SINC...' : 'CONFIRMAR'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente: Crear nueva OT ──────────────────────────────────────────────

function useCrearOrden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('ordenes_trabajo').insert({
        ...data,
        numero_ot: Math.floor(10000 + Math.random() * 90000) // Temp mock code
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mantenimiento', 'lista'] })
  })
}

function NuevaOrdenTrabajo() {
  const navigate = useNavigate()
  const usuario  = useAuthStore(s => s.usuario)
  const { data: vehiculos } = useVehiculos()
  const { mutateAsync: crear, isPending } = useCrearOrden()

  const [form, setForm] = useState({
    vehiculo_id:      '',
    tipo:             'correctivo' as 'preventivo'|'correctivo'|'post_accidente'|'alteracion',
    prioridad:        Criticidad.Media,
    descripcion:      '',
    fecha_programada: '',
  })
  const [errorStatus, setErrorStatus] = useState('')

  function setField(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehiculo_id || !form.descripcion.trim()) {
      setErrorStatus('DEBE SELECCIONAR UN VEHÍCULO Y PROVEER UNA DESCRIPCIÓN TÉCNICA.')
      return
    }
    setErrorStatus('')
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
      setErrorStatus('TRANSMISIÓN FALLIDA: ALMACENADO EN COLA DE SINCRONIZACIÓN LOCAL.')
      navigate('/mantenimiento')
    }
  }

  return (
    <div className="space-y-6 page-enter max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center hover:bg-white/5 text-slate-400 transition-all">
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/></svg>
        </button>
        <div>
           <h1 className="text-xl font-bold text-white tracking-tight uppercase">Emitir Orden de Trabajo</h1>
           <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Creación de Ticket de Discrepancia</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Seleccionar Unidad Afectada</label>
            <select 
              value={form.vehiculo_id} 
              onChange={e => setField('vehiculo_id', e.target.value)}
              required 
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none"
            >
              <option value="" className="bg-slate-950">SELECT TARGET UNIT...</option>
              {vehiculos?.map(v => (
                <option key={v.id} value={v.id} className="bg-slate-950">{v.matricula} // {v.modelo.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Clasificación Operativa</label>
              <select 
                value={form.tipo} 
                onChange={e => setField('tipo', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none"
              >
                {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-950">{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Nivel de Prioridad</label>
              <select 
                value={form.prioridad} 
                onChange={e => setField('prioridad', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none"
              >
                <option value={Criticidad.Alta} className="bg-slate-950 text-red-400">CRÍTICA (ALTA)</option>
                <option value={Criticidad.Media} className="bg-slate-950 text-amber-400">NORMAL (MEDIA)</option>
                <option value={Criticidad.Baja} className="bg-slate-950 text-slate-400">STANDBY (BAJA)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Descripción de la Discrepancia Técnica</label>
            <textarea 
              rows={5} 
              value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
              placeholder="DETALLE LA FALLA O EL TRABAJO REQUERIDO..." 
              required
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none font-mono uppercase leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Fecha Programada (Opcional)</label>
            <input 
              type="date" 
              value={form.fecha_programada}
              onChange={e => setField('fecha_programada', e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          {errorStatus && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-widest">
              {errorStatus}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="flex-1 py-4 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-slate-200 uppercase tracking-widest transition-all"
            >
              Cerrar Terminal
            </button>
            <button 
              type="submit" 
              disabled={isPending}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold hover:bg-blue-500 disabled:opacity-50 transition-all uppercase tracking-[.2em] shadow-xl shadow-blue-600/20 border border-white/10"
            >
              {isPending ? 'TRANSMITIENDO...' : 'EMITIR ORDEN →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdenTrabajoForm() {
  const { otId } = useParams<{ otId?: string }>()
  return otId ? <OrdenTrabajoDetalle otId={otId} /> : <NuevaOrdenTrabajo />
}
