// ─── Inspección de Recibo — SEI-006 Sección C ────────────────────────────────
// El Bombero verifica el trabajo de la ODMA y certifica el retorno al servicio
// Aparece cuando hay un vehículo en estado 'pendiente_verificacion'

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useScope } from '@/hooks/useScope'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

// ─── Hook: vehículos pendientes de verificación ──────────────────────────────

function useVehiculosPendientes(estacionId: string | null) {
  return useQuery({
    queryKey: ['recibo', 'pendientes', estacionId],
    queryFn: async () => {
      let q = supabase
        .from('vehiculos')
        .select(`
          id, matricula, modelo, anio, estado,
          estacion:estaciones(nombre, codigo_iata)
        `)
        .eq('estado', 'pendiente_verificacion')

      if (estacionId) q = q.eq('estacion_id', estacionId)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  })
}

function useUltimaOT(vehiculoId: string) {
  return useQuery({
    queryKey: ['recibo', 'ot', vehiculoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          id, numero_ot, descripcion, tipo,
          informe_tecnico, actividades_realizadas,
          partes_instaladas, firma_inspector_odma,
          motivo_diferido, horas_labor, fecha_cierre
        `)
        .eq('vehiculo_id', vehiculoId)
        .in('estado', ['cerrada', 'en_proceso'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      if (error) return null
      return data
    },
    enabled: !!vehiculoId,
  })
}

// ─── Formulario de recibo por vehículo ───────────────────────────────────────

function FormularioRecibo({ vehiculo }: { v: any; vehiculo: any }) {
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const usuario   = useAuthStore(s => s.usuario)

  const { data: ot, isLoading: loadingOT } = useUltimaOT(vehiculo.id)

  const [resultado,     setResultado]     = useState<'aprobado' | 'rechazado' | 'con_diferidos'>('aprobado')
  const [observaciones, setObservaciones] = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState('')

  async function handleFirmar() {
    if (resultado === 'rechazado' && !observaciones.trim()) {
      setError('Describe qué falla persiste para rechazar el recibo')
      return
    }
    setGuardando(true)
    setError('')

    try {
      // 1. Estado final del vehículo
      const estadoFinal = resultado === 'rechazado'
        ? 'fuera_de_servicio'
        : 'operativo'

      await supabase.from('vehiculos')
        .update({ estado: estadoFinal })
        .eq('id', vehiculo.id)

      // 2. Registrar verificación en la OT
      if (ot) {
        await supabase.from('ordenes_trabajo')
          .update({
            verificacion_recibo:  observaciones || 'Verificación de recibo aprobada',
            firma_bombero_recibo: usuario?.nombre_completo,
            resultado_recibo:     resultado,
            estado: resultado === 'rechazado' ? 'abierta' : 'cerrada',
          })
          .eq('id', ot.id)
      }

      qc.invalidateQueries({ queryKey: ['recibo'] })
      qc.invalidateQueries({ queryKey: ['vehiculos'] })
      qc.invalidateQueries({ queryKey: ['ordenes'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })

      navigate('/')
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  const RESULTADO_OPT = [
    {
      v: 'aprobado',
      l: 'FALLA RESUELTA',
      desc: 'El sistema fue reparado correctamente. Vehículo apto para servicio.',
      color: 'border-emerald-500',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30 bg-emerald-500/5',
      text: 'text-emerald-400',
      estadoFinal: '→ OPERATIVO',
    },
    {
      v: 'con_diferidos',
      l: 'APTO CON DIFERIDOS',
      desc: 'La falla principal fue resuelta pero quedan discrepancias menores diferidas (Cat. B/C/D).',
      color: 'border-amber-500',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30 bg-amber-500/5',
      text: 'text-amber-400',
      estadoFinal: '→ OPERATIVO',
    },
    {
      v: 'rechazado',
      l: 'FALLA PERSISTE',
      desc: 'La falla no fue resuelta o se detectó una nueva. Vehículo NO puede operar.',
      color: 'border-red-500',
      bg: 'bg-red-500/15',
      border: 'border-red-500/30 bg-red-500/5',
      text: 'text-red-400',
      estadoFinal: '→ FUERA DE SERVICIO',
    },
  ]

  const estacion = vehiculo.estacion as any

  return (
    <div className="space-y-5">

      {/* Info vehículo */}
      <div className="glass-panel rounded-2xl border border-amber-500/20 p-5">
        <p className="text-[9px] font-bold text-amber-400/70 uppercase tracking-widest mb-3">
          Vehículo pendiente de verificación
        </p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20
                          flex items-center justify-center">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" className="text-amber-400">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xl text-white">{vehiculo.matricula}</span>
              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400
                               border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                PENDIENTE RECIBO
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
              {vehiculo.modelo} · {vehiculo.anio} · {estacion?.codigo_iata} — {estacion?.nombre}
            </p>
          </div>
        </div>
      </div>

      {/* Informe de la ODMA */}
      {loadingOT ? (
        <div className="flex justify-center py-4"><Spinner size="sm"/></div>
      ) : ot ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Informe técnico ODMA — {ot.numero_ot || 'OT sin número'}
          </p>

          {/* Descripción original */}
          <div className="bg-white/2 rounded-xl px-4 py-3">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
              Discrepancia reportada
            </p>
            <p className="text-xs text-slate-400">{ot.descripcion}</p>
          </div>

          {/* Informe de lo que hizo la ODMA */}
          {ot.informe_tecnico && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3">
              <p className="text-[9px] text-blue-400/70 uppercase tracking-widest mb-1">
                Trabajo realizado por ODMA
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{ot.informe_tecnico}</p>
            </div>
          )}

          {/* Actividades */}
          {ot.actividades_realizadas && (() => {
            try {
              const acts = JSON.parse(ot.actividades_realizadas as string)
              if (!acts?.length) return null
              return (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">
                    Actividades realizadas
                  </p>
                  <div className="space-y-1.5">
                    {acts.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-slate-700 shrink-0 font-mono">{i + 1}.</span>
                        <div>
                          <p className="text-slate-300">{a.actividad}</p>
                          {a.referencia_manual && (
                            <p className="text-[10px] text-slate-600 font-mono">
                              Ref: {a.referencia_manual}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            } catch { return null }
          })()}

          {/* Partes instaladas */}
          {ot.partes_instaladas && (() => {
            try {
              const parts = JSON.parse(ot.partes_instaladas as string)
              if (!parts?.length) return null
              return (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">
                    Partes instaladas
                  </p>
                  <div className="space-y-1">
                    {parts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs
                                              glass-panel rounded-lg border border-white/5 px-3 py-2">
                        <span className="text-slate-300">{p.descripcion}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          {p.numero_parte && (
                            <span className="font-mono text-[10px] text-blue-400">{p.numero_parte}</span>
                          )}
                          <span className="text-slate-500 font-mono">×{p.cantidad}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            } catch { return null }
          })()}

          {/* Diferidos */}
          {ot.motivo_diferido && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-[9px] text-amber-400 uppercase tracking-widest mb-1">
                ⚠ Trabajo diferido
              </p>
              <p className="text-xs text-amber-300">{ot.motivo_diferido.replace(/_/g, ' ')}</p>
            </div>
          )}

          {/* Firma ODMA */}
          {ot.firma_inspector_odma && (
            <div className="flex items-center gap-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"/>
              <p className="text-[10px] text-purple-400 uppercase tracking-widest">
                Firmado por Inspector ODMA: {ot.firma_inspector_odma}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/5 px-5 py-4">
          <p className="text-sm text-slate-500 text-center">Sin informe técnico disponible</p>
        </div>
      )}

      {/* Resultado de la verificación */}
      <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Certificación de Operación Segura — SEI-001
        </p>
        <p className="text-xs text-slate-400">
          Como Maquinista de turno, realiza la prueba operacional y certifica el resultado:
        </p>

        <div className="space-y-2">
          {RESULTADO_OPT.map(opt => (
            <button key={opt.v}
              onClick={() => setResultado(opt.v as any)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                resultado === opt.v ? `${opt.bg} ${opt.color}` : opt.border
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                resultado === opt.v ? opt.color + ' ' + opt.color.replace('text', 'border') : 'border-slate-600'
              }`}>
                {resultado === opt.v && (
                  <div className={`w-2 h-2 rounded-full ${opt.text.replace('text', 'bg')}`}/>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${
                    resultado === opt.v ? opt.text : 'text-slate-400'
                  }`}>{opt.l}</p>
                  <span className="text-[9px] text-slate-600 font-mono">{opt.estadoFinal}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            {resultado === 'rechazado'
              ? 'Descripción de la falla que persiste *'
              : 'Observaciones del recibo (opcional)'}
          </label>
          <textarea rows={3} value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder={resultado === 'rechazado'
              ? 'Describe qué falla persiste o qué no fue reparado correctamente...'
              : 'Observaciones adicionales del maquinista de turno...'}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                       text-sm text-slate-200 placeholder-slate-600 resize-none
                       focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
        </div>

        {/* Firma del Maquinista */}
        <div className="border border-white/10 rounded-xl p-4">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-3">
            Firma Maquinista de Turno
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20
                            flex items-center justify-center">
              <span className="text-red-400 font-bold text-sm">
                {usuario?.nombre_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">{usuario?.nombre_completo}</p>
              <p className="text-[10px] text-red-400 uppercase tracking-widest">
                Maquinista · {formatDate(new Date())}
              </p>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
            Al firmar, certifico que realicé la prueba operacional del vehículo y que el resultado
            consignado corresponde al estado real de la MRE. Esta certificación queda registrada
            en el Libro de Operación SEI-001.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Botón firmar */}
        <button
          onClick={handleFirmar}
          disabled={guardando || (resultado === 'rechazado' && !observaciones.trim())}
          className={`w-full py-4 text-white text-xs font-bold rounded-xl uppercase tracking-widest
                     transition-all disabled:opacity-40 shadow-lg ${
            resultado === 'rechazado'
              ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
              : resultado === 'con_diferidos'
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
          }`}>
          {guardando ? 'Guardando...' :
            resultado === 'rechazado'
              ? '✗ Rechazar — Vehículo FUERA DE SERVICIO'
              : resultado === 'con_diferidos'
              ? '✓ Liberar con Diferidos — OPERATIVO'
              : '✓ Certificar Operación Segura — OPERATIVO'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InspeccionRecibo() {
  const { estacionId } = useScope()
  const { data: vehiculos, isLoading } = useVehiculosPendientes(estacionId)

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg"/></div>
  )

  if (!vehiculos?.length) return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none"/>
      <div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-emerald-400/70 mb-1">
          Verificación de Recibo · SEI-001
        </p>
        <h1 className="text-2xl font-bold text-white">INSPECCIÓN DE RECIBO</h1>
      </div>
      <div className="glass-panel rounded-2xl border border-emerald-500/20 p-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" width="28" height="28" fill="currentColor" className="text-emerald-400">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
          </svg>
        </div>
        <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">
          Sin vehículos pendientes de verificación
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Todos los vehículos están al día. No hay trabajos de ODMA pendientes de recibo.
        </p>
      </div>
    </div>
  )

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] pointer-events-none"/>

      <div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-amber-400/70 mb-1">
          Verificación de Recibo · SEI-001
        </p>
        <h1 className="text-2xl font-bold text-white">INSPECCIÓN DE RECIBO</h1>
        <p className="text-slate-400 text-xs mt-1">
          {vehiculos.length} vehículo{vehiculos.length > 1 ? 's' : ''} pendiente{vehiculos.length > 1 ? 's' : ''} de verificación
        </p>
      </div>

      {vehiculos.map(v => (
        <FormularioRecibo key={v.id} v={v} vehiculo={v} />
      ))}
    </div>
  )
}
