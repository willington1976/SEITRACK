import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useCrearOrden } from '@/hooks/useMantenimiento'
import { useVehiculos } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { Criticidad, Rol } from '@/core/enums'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { OrdenTrabajo } from '@/core/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParteInstalada {
  id:          string
  descripcion: string
  numero_parte: string
  cantidad:    number
}

interface ActividadRealizada {
  id:                  string
  actividad:           string
  referencia_manual:   string
  tecnico_responsable: string
}

// ─── Estilos Mission Control ──────────────────────────────────────────────────

const PRIORIDAD = {
  alta:  { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/20',   bar: 'bg-red-500',   label: 'PRIORIDAD ALTA' },
  media: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500', label: 'PRIORIDAD MEDIA' },
  baja:  { bg: 'bg-slate-700/20', text: 'text-slate-400', border: 'border-white/10',     bar: 'bg-slate-500', label: 'PRIORIDAD BAJA' },
}

const INPUT_CLS = `w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
  text-sm text-slate-200 placeholder-slate-600
  focus:outline-none focus:ring-1 focus:ring-blue-500/30`

const LABEL_CLS = `block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5`

// ─── Hook OT ─────────────────────────────────────────────────────────────────

function useOrdenTrabajo(id: string | undefined) {
  return useQuery({
    queryKey: ['orden_trabajo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          *,
          vehiculo:vehiculos(
            id, matricula, modelo, anio, estado,
            estacion:estaciones(nombre, codigo_iata)
          ),
          creado_por_usuario:usuarios!ordenes_trabajo_creado_por_fkey(nombre_completo),
          asignado_usuario:usuarios!ordenes_trabajo_asignado_a_fkey(nombre_completo)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as OrdenTrabajo & {
        vehiculo: { id: string; matricula: string; modelo: string; anio: number; estado: string; estacion: { nombre: string; codigo_iata: string } }
        creado_por_usuario: { nombre_completo: string }
        asignado_usuario: { nombre_completo: string } | null
      }
    },
    enabled: !!id,
  })
}

// ─── Sección SEI-006: Cierre técnico ODMA ────────────────────────────────────

function CierreTecnicoODMA({ ot, onClosed }: {
  ot: any
  onClosed: () => void
}) {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)
  const navigate = useNavigate()

  const [paso, setPaso] = useState<'informe' | 'partes' | 'firma'>('informe')
  const [guardando, setGuardando] = useState(false)

  // Sección B — Actividades realizadas
  const [actividades, setActividades] = useState<ActividadRealizada[]>([
    { id: '1', actividad: '', referencia_manual: '', tecnico_responsable: usuario?.nombre_completo ?? '' }
  ])

  // Partes instaladas
  const [partes, setPartes] = useState<ParteInstalada[]>([])

  // Datos generales
  const [horasLabor,    setHorasLabor]    = useState('')
  const [numeroSEI006,  setNumeroSEI006]  = useState('')
  const [informeGeneral,setInformeGeneral]= useState('')
  const [resultado,     setResultado]     = useState<'cerrada' | 'diferida'>('cerrada')
  const [motivoDiferido,setMotivoDiferido]= useState('')

  // ── Actividades ──────────────────────────────────────────────────────────

  function addActividad() {
    setActividades(prev => [...prev, {
      id: Date.now().toString(),
      actividad: '', referencia_manual: '',
      tecnico_responsable: usuario?.nombre_completo ?? ''
    }])
  }

  function updateActividad(id: string, field: keyof ActividadRealizada, value: string) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  function removeActividad(id: string) {
    if (actividades.length === 1) return
    setActividades(prev => prev.filter(a => a.id !== id))
  }

  // ── Partes ───────────────────────────────────────────────────────────────

  function addParte() {
    setPartes(prev => [...prev, {
      id: Date.now().toString(), descripcion: '', numero_parte: '', cantidad: 1
    }])
  }

  function updateParte(id: string, field: keyof ParteInstalada, value: string | number) {
    setPartes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function removeParte(id: string) {
    setPartes(prev => prev.filter(p => p.id !== id))
  }

  // ── Guardar cierre ───────────────────────────────────────────────────────

  async function handleCerrar() {
    if (!informeGeneral.trim()) return
    if (resultado === 'diferida' && !motivoDiferido.trim()) return
    setGuardando(true)
    try {
      const update: Record<string, unknown> = {
        estado:           resultado === 'cerrada' ? 'cerrada' : 'en_proceso',
        informe_tecnico:  informeGeneral,
        numero_sei_006:   numeroSEI006 || null,
        horas_labor:      Number(horasLabor) || null,
        actividades_realizadas: JSON.stringify(actividades.filter(a => a.actividad.trim())),
        partes_instaladas:      JSON.stringify(partes.filter(p => p.descripcion.trim())),
        firma_inspector_odma:   usuario?.nombre_completo,
        fecha_cierre:           resultado === 'cerrada' ? new Date().toISOString().split('T')[0] : null,
      }

      if (resultado === 'diferida') {
        update.motivo_diferido = motivoDiferido
        // Vehículo queda en pendiente_verificacion
        update.estado = 'en_proceso'
      }

      const { error } = await supabase
        .from('ordenes_trabajo')
        .update(update)
        .eq('id', ot.id)

      if (error) throw error

      // Estado vehículo → pendiente verificación maquinista
      if (resultado === 'cerrada') {
        await supabase
          .from('vehiculos')
          .update({ estado: 'pendiente_verificacion' })
          .eq('id', ot.vehiculo_id)
      }

      qc.invalidateQueries({ queryKey: ['orden_trabajo'] })
      qc.invalidateQueries({ queryKey: ['ordenes'] })
      onClosed()
      navigate('/mantenimiento')
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const p = PRIORIDAD[ot.prioridad as keyof typeof PRIORIDAD] ?? PRIORIDAD.baja

  return (
    <div className="space-y-4">

      {/* Indicador de paso */}
      <div className="flex items-center gap-2">
        {[
          { k: 'informe', n: '1', l: 'Informe técnico' },
          { k: 'partes',  n: '2', l: 'Partes instaladas' },
          { k: 'firma',   n: '3', l: 'Cierre y firma' },
        ].map((s, i) => (
          <div key={s.k} className="flex items-center gap-2">
            <button onClick={() => setPaso(s.k as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                         uppercase tracking-wide transition-all ${
                paso === s.k
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px]">
                {s.n}
              </span>
              {s.l}
            </button>
            {i < 2 && <span className="text-slate-700 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* ── PASO 1: Informe técnico ─────────────────────────────────────── */}
      {paso === 'informe' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-white/5 p-5">
            <p className="text-[9px] font-bold text-purple-400/70 uppercase tracking-widest mb-4">
              Sección B — SEI-006 · Ejecución Técnica
            </p>

            {/* Número SEI-006 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={LABEL_CLS}>Número SEI-006</label>
                <input type="text" value={numeroSEI006}
                  onChange={e => setNumeroSEI006(e.target.value)}
                  placeholder="OT-2026-000001"
                  className={INPUT_CLS}/>
              </div>
              <div>
                <label className={LABEL_CLS}>Horas de labor</label>
                <input type="number" min="0" step="0.5" value={horasLabor}
                  onChange={e => setHorasLabor(e.target.value)}
                  placeholder="0.0"
                  className={INPUT_CLS}/>
              </div>
            </div>

            {/* Tabla de actividades realizadas */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={LABEL_CLS}>Actividades Realizadas</label>
                <button onClick={addActividad}
                  className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                  + Agregar fila
                </button>
              </div>

              <div className="space-y-2">
                {/* Header tabla */}
                <div className="grid grid-cols-12 gap-2 px-2">
                  <span className="col-span-5 text-[9px] text-slate-600 uppercase tracking-widest">
                    Actividad realizada
                  </span>
                  <span className="col-span-4 text-[9px] text-slate-600 uppercase tracking-widest">
                    Referencia manual fabricante
                  </span>
                  <span className="col-span-3 text-[9px] text-slate-600 uppercase tracking-widest">
                    Técnico responsable
                  </span>
                </div>

                {actividades.map((a, i) => (
                  <div key={a.id} className="grid grid-cols-12 gap-2 items-start
                                              glass-panel rounded-xl border border-white/5 p-2">
                    <div className="col-span-5">
                      <textarea rows={2} value={a.actividad}
                        onChange={e => updateActividad(a.id, 'actividad', e.target.value)}
                        placeholder="Describe la actividad realizada..."
                        className={`${INPUT_CLS} resize-none text-xs`}/>
                    </div>
                    <div className="col-span-4">
                      <input type="text" value={a.referencia_manual}
                        onChange={e => updateActividad(a.id, 'referencia_manual', e.target.value)}
                        placeholder="Cap. 3, Sección 4.2..."
                        className={`${INPUT_CLS} text-xs`}/>
                    </div>
                    <div className="col-span-2">
                      <input type="text" value={a.tecnico_responsable}
                        onChange={e => updateActividad(a.id, 'tecnico_responsable', e.target.value)}
                        className={`${INPUT_CLS} text-xs`}/>
                    </div>
                    <div className="col-span-1 flex justify-center pt-2">
                      {actividades.length > 1 && (
                        <button onClick={() => removeActividad(a.id)}
                          className="text-slate-700 hover:text-red-400 transition-colors text-lg leading-none">
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Informe general */}
            <div>
              <label className={LABEL_CLS}>Informe Técnico General *</label>
              <textarea rows={4} value={informeGeneral}
                onChange={e => setInformeGeneral(e.target.value)}
                placeholder="Descripción detallada del trabajo realizado, hallazgos, condición actual del vehículo..."
                className={`${INPUT_CLS} resize-none`}/>
            </div>
          </div>

          <button onClick={() => setPaso('partes')}
            disabled={!informeGeneral.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold
                       rounded-xl uppercase tracking-widest transition-all disabled:opacity-40">
            Continuar → Partes Instaladas
          </button>
        </div>
      )}

      {/* ── PASO 2: Partes instaladas ───────────────────────────────────── */}
      {paso === 'partes' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-white/5 p-5">
            <p className="text-[9px] font-bold text-purple-400/70 uppercase tracking-widest mb-4">
              Sección B — SEI-006 · Partes y Materiales Utilizados
            </p>

            {partes.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500 text-sm mb-3">No se instalaron partes</p>
                <button onClick={addParte}
                  className="text-blue-400 text-xs hover:text-blue-300 uppercase tracking-widest">
                  + Agregar parte instalada
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-2">
                  <span className="col-span-5 text-[9px] text-slate-600 uppercase tracking-widest">
                    Descripción del repuesto
                  </span>
                  <span className="col-span-4 text-[9px] text-slate-600 uppercase tracking-widest">
                    P/N (Número de parte)
                  </span>
                  <span className="col-span-2 text-[9px] text-slate-600 uppercase tracking-widest">
                    Cantidad
                  </span>
                  <span className="col-span-1"/>
                </div>

                {partes.map(p => (
                  <div key={p.id}
                    className="grid grid-cols-12 gap-2 items-center
                               glass-panel rounded-xl border border-white/5 p-2">
                    <div className="col-span-5">
                      <input type="text" value={p.descripcion}
                        onChange={e => updateParte(p.id, 'descripcion', e.target.value)}
                        placeholder="Filtro de aceite, manguera hidráulica..."
                        className={`${INPUT_CLS} text-xs`}/>
                    </div>
                    <div className="col-span-4">
                      <input type="text" value={p.numero_parte}
                        onChange={e => updateParte(p.id, 'numero_parte', e.target.value)}
                        placeholder="PN-123456-A"
                        className={`${INPUT_CLS} text-xs font-mono`}/>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" value={p.cantidad}
                        onChange={e => updateParte(p.id, 'cantidad', Number(e.target.value))}
                        className={`${INPUT_CLS} text-xs text-center`}/>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeParte(p.id)}
                        className="text-slate-700 hover:text-red-400 transition-colors text-lg leading-none">
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <button onClick={addParte}
                  className="w-full py-2 border border-dashed border-white/10 rounded-xl
                             text-[10px] text-slate-600 hover:text-blue-400 hover:border-blue-500/30
                             transition-all uppercase tracking-widest">
                  + Agregar parte
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPaso('informe')}
              className="flex-1 py-3 border border-white/10 text-slate-400 text-xs font-bold
                         rounded-xl uppercase tracking-widest hover:bg-white/5 transition-all">
              ← Volver
            </button>
            <button onClick={() => setPaso('firma')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold
                         rounded-xl uppercase tracking-widest transition-all">
              Continuar → Cierre y Firma
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Resultado y firma ───────────────────────────────────── */}
      {paso === 'firma' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-5">
            <p className="text-[9px] font-bold text-purple-400/70 uppercase tracking-widest">
              Sección C — SEI-006 · Cierre y Certificación Técnica
            </p>

            {/* Resultado de la intervención */}
            <div>
              <label className={LABEL_CLS}>Resultado de la intervención</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'cerrada', l: 'TRABAJO COMPLETADO',
                    desc: 'Todas las discrepancias fueron resueltas',
                    color: 'border-emerald-500/30 bg-emerald-500/5',
                    active: 'border-emerald-500 bg-emerald-500/15' },
                  { v: 'diferida', l: 'TRABAJO DIFERIDO',
                    desc: 'Quedan discrepancias pendientes de resolución',
                    color: 'border-amber-500/30 bg-amber-500/5',
                    active: 'border-amber-500 bg-amber-500/15' },
                ].map(opt => (
                  <button key={opt.v}
                    onClick={() => setResultado(opt.v as any)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      resultado === opt.v ? opt.active : opt.color
                    }`}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                      resultado === opt.v
                        ? opt.v === 'cerrada' ? 'text-emerald-400' : 'text-amber-400'
                        : 'text-slate-400'
                    }`}>{opt.l}</p>
                    <p className="text-[10px] text-slate-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo diferido */}
            {resultado === 'diferida' && (
              <div>
                <label className={LABEL_CLS}>Motivo del diferimiento *</label>
                <select value={motivoDiferido}
                  onChange={e => setMotivoDiferido(e.target.value)}
                  className={INPUT_CLS}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="repuesto_importacion">Repuesto en proceso de importación</option>
                  <option value="repuesto_no_disponible">Repuesto no disponible en el país</option>
                  <option value="requiere_taller_externo">Requiere taller especializado externo</option>
                  <option value="pendiente_autorizacion">Pendiente autorización DSNA/UAEAC</option>
                  <option value="otro">Otro (especificar en informe)</option>
                </select>
              </div>
            )}

            {/* Resumen del informe */}
            <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Resumen del cierre
              </p>
              {[
                { l: 'OT',              v: ot.numero_ot || '—' },
                { l: 'Vehículo',        v: `${ot.vehiculo?.matricula} — ${ot.vehiculo?.modelo}` },
                { l: 'Actividades',     v: `${actividades.filter(a => a.actividad.trim()).length} registradas` },
                { l: 'Partes instaladas', v: partes.length > 0 ? `${partes.length} partes declaradas` : 'Ninguna' },
                { l: 'Horas de labor',  v: horasLabor ? `${horasLabor} h` : '—' },
                { l: 'N° SEI-006',      v: numeroSEI006 || '—' },
              ].map(r => (
                <div key={r.l} className="flex justify-between text-xs">
                  <span className="text-slate-600 uppercase tracking-wide text-[9px]">{r.l}</span>
                  <span className="text-slate-300 font-mono">{r.v}</span>
                </div>
              ))}
            </div>

            {/* Firma del inspector */}
            <div className="border border-white/10 rounded-xl p-4">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-3">
                Firma Inspector ODMA
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20
                                flex items-center justify-center">
                  <span className="text-purple-400 font-bold text-sm">
                    {usuario?.nombre_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{usuario?.nombre_completo}</p>
                  <p className="text-[10px] text-purple-400 uppercase tracking-widest">
                    Inspector ODMA · {formatDate(new Date())}
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
                Al confirmar, certifico que el trabajo descrito fue ejecutado conforme a los procedimientos
                del fabricante y que la información consignada es verídica. El vehículo quedará en estado
                "Pendiente de verificación" hasta que el Maquinista de turno realice la inspección de recibo.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPaso('partes')}
              className="flex-1 py-3 border border-white/10 text-slate-400 text-xs font-bold
                         rounded-xl uppercase tracking-widest hover:bg-white/5 transition-all">
              ← Volver
            </button>
            <button
              onClick={handleCerrar}
              disabled={guardando || !informeGeneral.trim() || (resultado === 'diferida' && !motivoDiferido)}
              className={`flex-2 flex-1 py-3 text-white text-xs font-bold rounded-xl
                         uppercase tracking-widest transition-all disabled:opacity-40 ${
                resultado === 'cerrada'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}>
              {guardando ? 'Guardando...' :
                resultado === 'cerrada' ? '✓ Firmar y Cerrar OT' : '⚠ Firmar con Diferidos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Vista detalle de OT ──────────────────────────────────────────────────────

function OrdenTrabajoDetalle({ otId }: { otId: string }) {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const usuario  = useAuthStore(s => s.usuario)
  const { data: ot, isLoading } = useOrdenTrabajo(otId)

  const [iniciandoTrabajo, setIniciandoTrabajo] = useState(false)
  const [mostrarCierre,    setMostrarCierre]    = useState(false)

  const esODMA        = usuario?.rol === Rol.ODMA
  const puedeGestionar = esODMA
    || usuario?.rol === Rol.JefeEstacion
    || usuario?.rol === Rol.JefeRegional
    || usuario?.rol === Rol.JefeNacional

  const esCerrada = ot?.estado === 'cerrada' || ot?.estado === 'cancelada'
  const p = PRIORIDAD[ot?.prioridad as keyof typeof PRIORIDAD] ?? PRIORIDAD.baja

  async function marcarEnProceso() {
    if (!ot) return
    setIniciandoTrabajo(true)
    await supabase.from('ordenes_trabajo')
      .update({ estado: 'en_proceso' }).eq('id', ot.id)
    qc.invalidateQueries({ queryKey: ['orden_trabajo', otId] })
    qc.invalidateQueries({ queryKey: ['ordenes'] })
    setIniciandoTrabajo(false)
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>
  if (!ot) return (
    <div className="text-center py-16">
      <p className="text-slate-400 text-sm">Orden de trabajo no encontrada</p>
      <button onClick={() => navigate(-1)} className="mt-2 text-blue-400 text-sm hover:underline">Volver</button>
    </div>
  )

  // Parsear datos guardados
  const actividadesGuardadas = ot.actividades_realizadas
    ? JSON.parse(ot.actividades_realizadas as string) : []
  const partesGuardadas = ot.partes_instaladas
    ? JSON.parse(ot.partes_instaladas as string) : []

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/3 blur-[120px] pointer-events-none"/>

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 glass-panel rounded-xl border border-white/5 hover:border-white/10 transition-all mt-1">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-slate-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-amber-400/70 mb-0.5">
            Job Control Console · SEI-006
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-white">
              {ot.numero_ot || 'OT SIN NÚMERO'}
            </h1>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide
                             ${p.bg} ${p.text} ${p.border}`}>
              {p.label}
            </span>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide ${
              ot.estado === 'cerrada'    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              ot.estado === 'en_proceso' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              'bg-slate-700/20 text-slate-400 border-white/10'
            }`}>
              {ot.estado?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            {ot.vehiculo?.estacion?.codigo_iata} — {ot.vehiculo?.estacion?.nombre}
          </p>
        </div>
      </div>

      {/* Datos principales */}
      <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Sección A — Encabezado y Descripción de la Falla
        </p>

        {/* Descripción falla */}
        <div className={`rounded-xl border-l-2 ${p.bar} pl-4 py-3 bg-white/2`}>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
            Descripción de la discrepancia
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{ot.descripcion}</p>
        </div>

        {/* Datos técnicos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Vehículo',    v: ot.vehiculo?.matricula ?? '—' },
            { l: 'Modelo',      v: ot.vehiculo?.modelo ?? '—' },
            { l: 'Tipo OT',     v: ot.tipo?.replace('_', ' ').toUpperCase() ?? '—' },
            { l: 'Origen',      v: ot.tipo === 'preventivo' ? 'F1/F2/F3' : 'Correctivo' },
            { l: 'Reportado por', v: (ot.creado_por_usuario as any)?.nombre_completo ?? '—' },
            { l: 'Asignado a',  v: (ot.asignado_usuario as any)?.nombre_completo ?? 'ODMA' },
            { l: 'Fecha prog.', v: ot.fecha_programada ? formatDate(ot.fecha_programada) : '—' },
            { l: 'Creada',      v: formatDateTime(ot.created_at) },
          ].map(r => (
            <div key={r.l}>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">{r.l}</p>
              <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{r.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Si ya está cerrada — mostrar informe técnico */}
      {esCerrada && (
        <div className="space-y-3">
          {/* Informe técnico */}
          {(ot as any).informe_tecnico && (
            <div className="glass-panel rounded-2xl border border-emerald-500/20 p-5">
              <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mb-3">
                Sección B — Informe Técnico ODMA
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {(ot as any).informe_tecnico}
              </p>
              {(ot as any).horas_labor && (
                <p className="text-[10px] text-slate-500 mt-3 font-mono">
                  Horas de labor: {(ot as any).horas_labor} h
                  {(ot as any).numero_sei_006 && ` · SEI-006: ${(ot as any).numero_sei_006}`}
                </p>
              )}
            </div>
          )}

          {/* Actividades */}
          {actividadesGuardadas.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-bold text-white">Actividades realizadas</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['Actividad realizada', 'Ref. manual fabricante', 'Técnico'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold
                                              text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {actividadesGuardadas.map((a: any, i: number) => (
                      <tr key={i} className="hover:bg-white/2">
                        <td className="px-4 py-2.5 text-slate-300">{a.actividad}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">
                          {a.referencia_manual || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{a.tecnico_responsable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Partes instaladas */}
          {partesGuardadas.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-bold text-white">
                  Partes instaladas · {partesGuardadas.length} ítems
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['Descripción repuesto', 'P/N (Número de parte)', 'Cantidad'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold
                                              text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {partesGuardadas.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-white/2">
                        <td className="px-4 py-2.5 text-slate-300">{p.descripcion}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-300 text-[10px]">
                          {p.numero_parte || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono">{p.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Firma */}
          {(ot as any).firma_inspector_odma && (
            <div className="glass-panel rounded-xl border border-emerald-500/20 px-4 py-3
                            flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"/>
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
                Firmado por Inspector ODMA: {(ot as any).firma_inspector_odma}
                {ot.fecha_cierre && ` · ${formatDate(ot.fecha_cierre)}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Acciones ODMA — solo si está abierta/en proceso y es ODMA */}
      {!esCerrada && puedeGestionar && !mostrarCierre && (
        <div className="flex gap-2">
          {ot.estado === 'abierta' && (
            <button onClick={marcarEnProceso} disabled={iniciandoTrabajo}
              className="flex-1 py-3 border border-blue-500/30 text-blue-400 text-xs font-bold
                         rounded-xl uppercase tracking-widest hover:bg-blue-500/10 transition-all
                         disabled:opacity-40">
              {iniciandoTrabajo ? 'Iniciando...' : '▶ Iniciar Trabajo'}
            </button>
          )}
          {esODMA && (
            <button onClick={() => setMostrarCierre(true)}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold
                         rounded-xl uppercase tracking-widest transition-all">
              ✎ Diligenciar Informe SEI-006
            </button>
          )}
          {!esODMA && ot.estado === 'en_proceso' && (
            <button onClick={async () => {
              await supabase.from('ordenes_trabajo')
                .update({ estado: 'cerrada', fecha_cierre: new Date().toISOString().split('T')[0] })
                .eq('id', ot.id)
              qc.invalidateQueries({ queryKey: ['orden_trabajo', otId] })
              qc.invalidateQueries({ queryKey: ['ordenes'] })
            }}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold
                         rounded-xl uppercase tracking-widest transition-all">
              ✓ Cerrar OT
            </button>
          )}
        </div>
      )}

      {/* Formulario de cierre ODMA */}
      {mostrarCierre && esODMA && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Diligenciar SEI-006</p>
            <button onClick={() => setMostrarCierre(false)}
              className="text-slate-500 hover:text-slate-300 text-xs uppercase tracking-widest">
              Cancelar
            </button>
          </div>
          <CierreTecnicoODMA ot={ot} onClosed={() => setMostrarCierre(false)} />
        </div>
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
    <div className="relative space-y-5 max-w-2xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none"/>

      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 glass-panel rounded-xl border border-white/5 hover:border-white/10">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-slate-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div>
          <p className="text-[9px] text-amber-400/70 uppercase tracking-widest font-semibold">
            Job Control Console
          </p>
          <h1 className="text-xl font-bold text-white">GENERAR NUEVA OT</h1>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL_CLS}>Vehículo *</label>
            <select value={form.vehiculo_id}
              onChange={e => setField('vehiculo_id', e.target.value)} required
              className={INPUT_CLS}>
              <option value="">Seleccionar vehículo...</option>
              {vehiculos?.map(v => (
                <option key={v.id} value={v.id}>{v.matricula} — {v.modelo}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Tipo de OT</label>
              <select value={form.tipo} onChange={e => setField('tipo', e.target.value)}
                className={INPUT_CLS}>
                <option value="preventivo">Preventivo (F1/F2/F3)</option>
                <option value="correctivo">Correctivo</option>
                <option value="post_accidente">Post accidente</option>
                <option value="alteracion">Alteración</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Prioridad</label>
              <select value={form.prioridad} onChange={e => setField('prioridad', e.target.value)}
                className={INPUT_CLS}>
                <option value={Criticidad.Alta}>Alta</option>
                <option value={Criticidad.Media}>Media</option>
                <option value={Criticidad.Baja}>Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Descripción de la discrepancia *</label>
            <textarea rows={4} value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
              placeholder="Describe la falla o trabajo a realizar conforme al reporte del maquinista..."
              required className={`${INPUT_CLS} resize-none`}/>
          </div>

          <div>
            <label className={LABEL_CLS}>Fecha programada de intervención</label>
            <input type="date" value={form.fecha_programada}
              onChange={e => setField('fecha_programada', e.target.value)}
              className={INPUT_CLS}/>
          </div>

          {error && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2
                            text-sm text-amber-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 py-3 border border-white/10 rounded-xl text-sm
                         text-slate-400 hover:bg-white/5 transition-colors uppercase tracking-widest text-xs font-bold">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs
                         font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors uppercase tracking-widest">
              {isPending ? 'Creando...' : 'Generar OT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente raíz ─────────────────────────────────────────────────────────

export default function OrdenTrabajoForm() {
  const { otId } = useParams<{ otId?: string }>()
  return otId ? <OrdenTrabajoDetalle otId={otId} /> : <NuevaOrdenTrabajo />
}
