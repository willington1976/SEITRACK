import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useQuery } from '@tanstack/react-query'
import { supabase as sb } from '@/services/supabase'
import { useCrearInspeccion } from '@/hooks/useInspecciones'
import { useAuthStore } from '@/stores/auth.store'
import { ChecklistItemRow } from '@/components/forms/ChecklistItemRow'
import { FirmaDigital } from '@/components/forms/FirmaDigital'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { getChecklist, getTotalItems, getCriticosConFalla } from '@/lib/checklists'
import { getChecklistDB } from '@/services/checklists.service'
import { FaseInspeccion, ResultadoItem, ProgramaMTO, Rol } from '@/core/enums'
import { TURNO_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ItemInspeccion } from '@/core/types'

// Etiquetas de fases
const FASE_LABELS: Record<FaseInspeccion, string> = {
  [FaseInspeccion.CambioDeTurno]: 'Cambio de turno',
  [FaseInspeccion.F0]:  'Inspección F0 — Diaria',
  [FaseInspeccion.F1]:  'Inspección F1',
  [FaseInspeccion.F2]:  'Inspección F2',
  [FaseInspeccion.F3]:  'Inspección F3',
}

// Barra de progreso
function ProgressBar({ completados, total }: { completados: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completados / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{completados} de {total} ítems</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            pct === 100 ? 'bg-green-500' : pct > 60 ? 'bg-sei-500' : 'bg-amber-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Panel de resumen antes de firmar
function ResumenInspeccion({
  totalItems, completados, criticos, fallas, onFirmar, onVolver
}: {
  totalItems: number
  completados: number
  criticos: string[]
  fallas: number
  onFirmar: () => void
  onVolver: () => void
}) {
  const bloqueado = criticos.length > 0

  return (
    <div className="space-y-4">
      <div className={cn(
        'rounded-2xl p-5 border-2',
        bloqueado ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white text-lg',
            bloqueado ? 'bg-red-500' : 'bg-green-500'
          )}>
            {bloqueado ? '!' : '✓'}
          </div>
          <div>
            <p className={cn('font-semibold text-base', bloqueado ? 'text-red-800' : 'text-green-800')}>
              {bloqueado ? 'Vehículo NO puede liberarse' : 'Inspección completada'}
            </p>
            <p className={cn('text-xs', bloqueado ? 'text-red-600' : 'text-green-600')}>
              {completados}/{totalItems} ítems · {fallas} falla{fallas !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {bloqueado && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700">Ítems críticos con falla:</p>
            {criticos.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{c}</span>
              </div>
            ))}
            <p className="text-xs text-red-600 mt-3 font-medium">
              Se generará una Orden de Trabajo automáticamente y el vehículo quedará en estado "Fuera de servicio".
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onVolver}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Revisar
        </button>
        <button
          onClick={onFirmar}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors',
            bloqueado ? 'bg-red-600 hover:bg-red-700' : 'bg-sei-600 hover:bg-sei-700'
          )}
        >
          {bloqueado ? 'Firmar y reportar falla' : 'Firmar y liberar vehículo'}
        </button>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────

export default function InspeccionForm() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const usuario         = useAuthStore(s => s.usuario)

  const { data: vehiculo, isLoading } = useVehiculo(vehiculoId!)

  // Discrepancias activas del vehículo — novedades de turnos anteriores
  const { data: discrepanciasActivas } = useQuery({
    queryKey: ['discrepancias-activas', vehiculoId],
    queryFn: async () => {
      const { data } = await sb
        .from('discrepancias')
        .select('id, descripcion, sistema_afectado, criticidad, created_at')
        .eq('vehiculo_id', vehiculoId!)
        .in('estado', ['abierta', 'en_proceso'])
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!vehiculoId,
    staleTime: 1000 * 30,
  })
  const { mutateAsync: crearInspeccion, isPending: guardando } = useCrearInspeccion()

  // Fase desde query param, default cambio_turno
  const faseParam = (searchParams.get('fase') as FaseInspeccion) ?? FaseInspeccion.CambioDeTurno

  // Estado del formulario
  const [fase,    setFase]    = useState<FaseInspeccion>(faseParam)
  const [turno,   setTurno]   = useState<'dia' | 'tarde' | 'noche'>('dia')
  const [km,      setKm]      = useState('')
  const [horas,   setHoras]   = useState('')

  // Pre-poblar km y horas con valores actuales del vehículo cuando carga
  useEffect(() => {
    if (vehiculo) {
      if (!km) setKm(String(vehiculo.kilometraje_actual || ''))
      if (!horas) setHoras(String(vehiculo.horas_motor || ''))
    }
  }, [vehiculo?.id])
  const [obs,     setObs]     = useState('')

  // Resultados: { [itemId]: ResultadoItem }
  const [resultados,    setResultados]    = useState<Record<string, ResultadoItem>>({})
  // Observaciones por ítem: { [itemId]: string }
  const [obsItems,      setObsItems]      = useState<Record<string, string>>({})

  // Paso: 'checklist' | 'resumen' | 'firma' | 'exito'
  const [paso, setPaso] = useState<'checklist' | 'resumen' | 'firma' | 'exito'>('checklist')
  const [firmaData, setFirmaData] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Checklist dinámico según marca del vehículo
  const [sistemasDB, setSistemasDB] = useState<any[]>([])

  // Cargar checklist desde BD al cambiar fase o vehículo
  useEffect(() => {
    if (!vehiculo) return
    getChecklistDB(fase, vehiculo.programa_mto as ProgramaMTO).then(items => {
      setSistemasDB(items)
    })
  }, [vehiculo, fase])

  const sistemas = useMemo(() => {
    if (!vehiculo) return []
    // Usar BD si tiene datos, sino fallback local
    if (sistemasDB.length > 0) {
      return sistemasDB.map(s => ({
        sistema: s.sistema,
        items: s.items.map((item: any) => ({
          id:          item.id,
          sistema:     item.sistema,
          descripcion: item.descripcion,
          critico:     item.critico,
        }))
      }))
    }
    return getChecklist(fase, vehiculo.programa_mto as ProgramaMTO)
  }, [vehiculo, fase, sistemasDB])

  const totalItems  = getTotalItems(sistemas)
  const completados = Object.keys(resultados).length

  const handleResultado = useCallback((id: string, r: ResultadoItem) => {
    setResultados(prev => ({ ...prev, [id]: r }))
  }, [])

  const handleObsItem = useCallback((id: string, texto: string) => {
    setObsItems(prev => ({ ...prev, [id]: texto }))
  }, [])

  function irAResumen() {
    if (completados < totalItems) {
      setError(`Faltan ${totalItems - completados} ítems por evaluar`)
      return
    }
    const fallasSinObs = sistemas.flatMap(s => s.items).filter(
      item => resultados[item.id] === ResultadoItem.Falla && !obsItems[item.id]?.trim()
    )
    if (fallasSinObs.length > 0) {
      setError(`${fallasSinObs.length} falla(s) sin descripción. Agrega observación para cada falla.`)
      return
    }
    setError('')
    setPaso('resumen')
  }

  async function guardar(firmaUrl: string) {
    if (!vehiculo || !usuario) return
    setFirmaData(firmaUrl)

    const criticos = getCriticosConFalla(sistemas, resultados as Record<string, string>)
    const tieneFallas = Object.values(resultados).some(r => r === ResultadoItem.Falla)
    const resultado = criticos.length > 0
      ? 'rechazado'
      : tieneFallas ? 'con_observaciones' : 'aprobado'

    const items: Omit<ItemInspeccion, 'id' | 'inspeccion_id'>[] = sistemas
      .flatMap(s => s.items)
      .map(item => ({
        sistema:         item.sistema,
        descripcion_item: item.descripcion,
        resultado:       resultados[item.id] ?? ResultadoItem.NoAplica,
        observacion:     obsItems[item.id] ?? '',
        requiere_accion: resultados[item.id] === ResultadoItem.Falla,
      }))

    try {
      await crearInspeccion({
        inspeccion: {
          vehiculo_id:      vehiculo.id,
          inspector_id:     usuario.id,
          fase,
          fecha:            new Date().toISOString().split('T')[0],
          turno,
          km_al_momento:    Number(km) || vehiculo.kilometraje_actual,
          horas_al_momento: Number(horas) || vehiculo.horas_motor,
          resultado,
          observaciones:    obs,
          liberado_servicio: resultado !== 'rechazado',
          firmado_en:       new Date().toISOString(),
        },
        items,
      })

      // ── Acciones automáticas según resultado ──────────────────────────────
      const { supabase } = await import('@/services/supabase')

      // Actualizar km y horas del vehículo
      if (Number(km) > 0 || Number(horas) > 0) {
        const update: Record<string, number> = {}
        if (Number(km) > (vehiculo.kilometraje_actual || 0)) update.kilometraje_actual = Number(km)
        if (Number(horas) > (vehiculo.horas_motor || 0)) update.horas_motor = Number(horas)
        if (Object.keys(update).length > 0) {
          await supabase.from('vehiculos').update(update).eq('id', vehiculo.id)
        }
      }

      // ── Fallas con observaciones (Cat B/C/D) → discrepancia diferible ──
      if (resultado === 'con_observaciones') {
        const fallaItems = sistemas.flatMap(s => s.items).filter(
          item => resultados[item.id] === ResultadoItem.Falla
        )
        for (const item of fallaItems) {
          await supabase.from('discrepancias').insert({
            vehiculo_id:      vehiculo.id,
            reportado_por:    usuario.id,
            sistema_afectado: item.sistema,
            tipo_falla:       'cronica',
            descripcion:      item.descripcion + (obsItems[item.id] ? ': ' + obsItems[item.id] : ''),
            criticidad:       'media',
            estado:           'abierta',
          })
        }
      }

      if (resultado === 'rechazado' && criticos.length > 0) {
        // 1. Vehículo → FUERA DE SERVICIO inmediato (Cat A)
        await supabase.from('vehiculos')
          .update({ estado: 'fuera_de_servicio' })
          .eq('id', vehiculo.id)

        // 2. Crear discrepancia crítica
        const discDesc = 'Fallas detectadas en inspección ' + fase.toUpperCase() + ' - Turno ' + turno + ':\n' + criticos.map(c => '• ' + c).join('\n');

        const { data: disc } = await supabase.from('discrepancias').insert({
          vehiculo_id:      vehiculo.id,
          reportado_por:    usuario.id,
          sistema_afectado: 'Múltiples sistemas',
          tipo_falla:       'cronica',
          descripcion:      discDesc,
          criticidad:       'alta',
          estado:           'abierta',
        }).select('id').single()

        // 3. Crear OT correctiva automática
        if (disc?.id) {
          await supabase.from('ordenes_trabajo').insert({
            vehiculo_id:     vehiculo.id,
            creado_por:      usuario.id,
            discrepancia_id: disc.id,
            tipo:            'correctivo',
            prioridad:       'alta',
            estado:          'abierta',
            descripcion:     `[AUTO] Corrección requerida por inspección ${fase.toUpperCase()} rechazada. Fallas: ${criticos.slice(0, 3).join(', ')}${criticos.length > 3 ? ` y ${criticos.length - 3} más` : ''}`,
          })
        }
      }

      setPaso('exito')
    } catch (e: unknown) {
      setError('Error al guardar. Los datos quedan en espera de sincronización.')
      setPaso('exito') // igual avanzar — está en cola offline
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!vehiculo) return <p className="text-gray-400 text-sm text-center py-16">Vehículo no encontrado</p>

  // ─── PANTALLA ÉXITO ───────────────────────────────────────────────────────
  if (paso === 'exito') {
    const criticosFinales = getCriticosConFalla(sistemas, resultados as Record<string, string>)
    const esRechazado     = criticosFinales.length > 0
    const tieneObs        = !esRechazado && Object.values(resultados).some(r => r === ResultadoItem.Falla)

    return (
      <div className="relative flex flex-col items-center justify-center min-h-64 text-center space-y-5 py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[80px] opacity-30 ${
            esRechazado ? 'bg-red-500' : tieneObs ? 'bg-amber-500' : 'bg-emerald-500'
          }`}/>
        </div>

        {/* Ícono resultado */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl
                         border-2 ${
          esRechazado
            ? 'border-red-500/50 bg-red-500/10'
            : tieneObs
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-emerald-500/50 bg-emerald-500/10'
        }`}>
          {esRechazado ? '🚨' : tieneObs ? '⚠️' : '✅'}
        </div>

        {/* Mensaje */}
        <div className="space-y-2">
          <p className={`text-xl font-bold uppercase tracking-wide ${
            esRechazado ? 'text-red-400' : tieneObs ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {esRechazado
              ? 'VEHÍCULO FUERA DE SERVICIO'
              : tieneObs
              ? 'INSPECCIÓN CON OBSERVACIONES'
              : 'VEHÍCULO LIBERADO AL SERVICIO'}
          </p>
          <p className="text-sm text-slate-400 max-w-sm">
            {esRechazado
              ? `${vehiculo.matricula} fue bloqueado automáticamente. Se generó una OT correctiva para la ODMA.`
              : tieneObs
              ? `${vehiculo.matricula} liberado con observaciones. El Jefe de Estación debe revisar.`
              : `${vehiculo.matricula} aprobado para operación segura en este turno.`}
          </p>
          {esRechazado && (
            <div className="glass-panel rounded-xl border border-red-500/20 px-4 py-3 text-left mt-2">
              <p className="text-[9px] text-red-400 uppercase tracking-widest font-bold mb-2">
                Fallas críticas detectadas:
              </p>
              {criticosFinales.slice(0, 5).map((c, i) => (
                <p key={i} className="text-xs text-slate-300 leading-snug">• {c}</p>
              ))}
              {criticosFinales.length > 5 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  y {criticosFinales.length - 5} fallas más...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button onClick={() => navigate('/')}
            className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold
                        uppercase tracking-wide transition-all ${
              esRechazado
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}>
            Ir al Dashboard
          </button>
          <button onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-white/10 rounded-xl text-sm
                       text-slate-400 hover:bg-white/5 transition-colors">
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ─── RESUMEN ──────────────────────────────────────────────────────────────
  if (paso === 'resumen') {
    const criticos = getCriticosConFalla(sistemas, resultados as Record<string, string>)
    const fallas   = Object.values(resultados).filter(r => r === ResultadoItem.Falla).length
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setPaso('checklist')} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-gray-900">Resumen de inspección</h2>
        </div>
        <ResumenInspeccion
          totalItems={totalItems}
          completados={completados}
          criticos={criticos}
          fallas={fallas}
          onFirmar={() => setPaso('firma')}
          onVolver={() => setPaso('checklist')}
        />
        {paso === 'resumen' && firmaData === null && (
          <FirmaDigital
            nombre={usuario?.nombre_completo ?? ''}
            onFirmar={guardar}
            onCancelar={() => setPaso('resumen')}
          />
        )}
      </>
    )
  }

  // ─── PANTALLA FIRMA ───────────────────────────────────────────────────────
  if (paso === 'firma') {
    return (
      <>
        <ResumenInspeccion
          totalItems={totalItems}
          completados={completados}
          criticos={getCriticosConFalla(sistemas, resultados as Record<string, string>)}
          fallas={Object.values(resultados).filter(r => r === ResultadoItem.Falla).length}
          onFirmar={() => {}} // no-op, el modal ya está abierto
          onVolver={() => setPaso('resumen')}
        />
        <FirmaDigital
          nombre={usuario?.nombre_completo ?? ''}
          onFirmar={async (url) => { await guardar(url) }}
          onCancelar={() => setPaso('resumen')}
        />
      </>
    )
  }

  // ─── CHECKLIST PRINCIPAL ─────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold font-mono text-white">{vehiculo.matricula}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{vehiculo.modelo} · {vehiculo.programa_mto}</p>
          </div>
        </div>
        <Badge variant="info">{FASE_LABELS[fase]}</Badge>
      </div>

      {/* Selector de fase — filtrado por rol */}
      {(() => {
        const rolUsuario = usuario?.rol as Rol
        const fasesBombero = [FaseInspeccion.CambioDeTurno, FaseInspeccion.F0]
        const fasesODMA    = [FaseInspeccion.F1, FaseInspeccion.F2, FaseInspeccion.F3]
        const fasesVisible =
          rolUsuario === Rol.ODMA ? fasesODMA
          : rolUsuario === Rol.JefeNacional || rolUsuario === Rol.JefeRegional || rolUsuario === Rol.JefeEstacion
          ? Object.values(FaseInspeccion)
          : fasesBombero  // bombero y default

        return (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {fasesVisible.map(f => (
              <button
                key={f}
                onClick={() => { setFase(f); setResultados({}); setObsItems({}) }}
                className={cn(
                  'shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold uppercase tracking-wide',
                  fase === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                )}
              >
                {f === FaseInspeccion.CambioDeTurno ? 'Cambio turno' : f.toUpperCase()}
              </button>
            ))}
          </div>
        )
      })()}

      {/* Datos del registro */}
      <div className="glass-panel rounded-2xl border border-white/5 p-4 space-y-3">
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Telemetry Input</p>
        <div className="grid grid-cols-3 gap-2">
          {/* Turno */}
          <div>
            <label className="block text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Indicador Turno</label>
            <select
              value={turno}
              onChange={e => setTurno(e.target.value as typeof turno)}
              className="w-full text-sm bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            >
              <option value="dia">Mañana (06:00-14:00)</option>
              <option value="tarde">Tarde (14:00-22:00)</option>
              <option value="noche">Noche (22:00-06:00)</option>
            </select>
          </div>
          {/* KM */}
          <div>
            <label className="block text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Odómetro KM</label>
            <input
              type="number"
              placeholder={String(vehiculo.kilometraje_actual)}
              value={km}
              onChange={e => setKm(e.target.value)}
              className="w-full text-sm bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
            />
          </div>
          {/* Horas */}
          <div>
            <label className="block text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Engine Hours</label>
            <input
              type="number"
              placeholder={String(vehiculo.horas_motor)}
              value={horas}
              onChange={e => setHoras(e.target.value)}
              className="w-full text-sm bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
            />
          </div>
        </div>
        {/* Obs general */}
        <div>
          <label className="block text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Novedades especiales del turno</label>
          <textarea
            rows={2}
            placeholder="Sin novedades..."
            value={obs}
            onChange={e => setObs(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400 resize-none"
          />
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <ProgressBar completados={completados} total={totalItems} />
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-3 text-[11px] text-gray-400 px-1">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span>Ítem crítico</span>
        </div>
        <span>·</span>
        <span>Evalúa cada ítem: OK / OBS / FALLA / N/A</span>
      </div>

      {/* ── Novedades de turno anterior ─────────────────────────────── */}
      {discrepanciasActivas && discrepanciasActivas.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
              ⚠ {discrepanciasActivas.length} Novedad{discrepanciasActivas.length > 1 ? 'es' : ''} activa{discrepanciasActivas.length > 1 ? 's' : ''} — turno anterior
            </p>
          </div>
          {discrepanciasActivas.map((d: any) => (
            <div key={d.id}
              className="flex items-start gap-2 bg-slate-950/50 rounded-xl px-3 py-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                d.criticidad === 'alta' ? 'bg-red-400' : 'bg-amber-400'
              }`}/>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug">{d.descripcion}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">
                  {d.sistema_afectado}
                  {d.criticidad === 'alta' && (
                    <span className="ml-2 text-red-400 font-bold">· CRÍTICA</span>
                  )}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[9px] text-slate-500 pt-1">
            Estas novedades permanecen hasta que la ODMA las corrija y el bombero verifique el recibo.
          </p>
        </div>
      )}

      {/* Checklist por sistemas */}
      {sistemas.map(sistema => {
        // Verificar si este sistema tiene discrepancias activas
        const discSistema = (discrepanciasActivas ?? []).filter((d: any) =>
          d.sistema_afectado?.toLowerCase().includes(sistema.sistema.toLowerCase()) ||
          sistema.sistema.toLowerCase().includes(d.sistema_afectado?.toLowerCase() ?? '')
        )

        return (
        <div key={sistema.sistema} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide px-1">
                {sistema.sistema}
              </h3>
              {discSistema.length > 0 && (
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400
                                 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  ⚠ NOVEDAD
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {sistema.items.filter(i => resultados[i.id]).length}/{sistema.items.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {sistema.items.map(item => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                resultado={resultados[item.id]}
                observacion={obsItems[item.id] ?? ''}
                onChange={handleResultado}
                onObservacion={handleObsItem}
              />
            ))}
          </div>
        </div>
        )
      })}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Barra de acción fija abajo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:left-56">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar completados={completados} total={totalItems} />
          </div>
          <button
            onClick={irAResumen}
            disabled={guardando}
            className="shrink-0 px-6 py-2.5 bg-sei-600 text-white text-sm font-semibold rounded-xl hover:bg-sei-700 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Finalizar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
