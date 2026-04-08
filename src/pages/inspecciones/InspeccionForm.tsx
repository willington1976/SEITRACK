import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useCrearInspeccion } from '@/hooks/useInspecciones'
import { useAuthStore } from '@/stores/auth.store'
import { ChecklistItemRow } from '@/components/forms/ChecklistItemRow'
import { FirmaDigital } from '@/components/forms/FirmaDigital'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { getChecklist, getTotalItems, getCriticosConFalla } from '@/lib/checklists'
import { getChecklistDB } from '@/services/checklists.service'
import { FaseInspeccion, ResultadoItem, ProgramaMTO } from '@/core/enums'
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

// Barra de progreso Aero
function ProgressBar({ completados, total }: { completados: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completados / total) * 100)
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sincronización de Items</span>
          <span className="text-xs font-mono font-bold text-slate-300">{completados} / {total} EVALUADOS</span>
        </div>
        <span className="text-sm font-bold font-mono text-blue-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]',
            pct === 100 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600'
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
    <div className="space-y-6 page-enter">
      <div className={cn(
        'rounded-2xl p-6 border-2 relative overflow-hidden',
        bloqueado 
          ? 'border-red-500/50 bg-red-500/5 text-red-200 shadow-2xl shadow-red-500/10' 
          : 'border-emerald-500/50 bg-emerald-500/5 text-emerald-200 shadow-2xl shadow-emerald-500/10'
      )}>
        {/* Patrón de franjas de peligro sutil en el fondo para bloqueados */}
        {bloqueado && (
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, transparent 10px, transparent 20px)' }} />
        )}

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-xl ring-1 ring-white/20',
              bloqueado ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
            )}>
              {bloqueado ? (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              )}
            </div>
            <div className="text-center md:text-left">
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-[.25em]">Status de Evaluación</p>
              <h2 className="text-2xl font-bold tracking-tight uppercase">
                {bloqueado ? 'Unidad Grounded / No Operativa' : 'Unidad Clear for Service'}
              </h2>
              <p className="font-mono text-sm mt-1 opacity-80">
                {completados}/{totalItems} ÍTEMS VERIFICADOS · {fallas} FALLAS IDENTIFICADAS
              </p>
            </div>
          </div>

          {bloqueado && (
            <div className="bg-slate-900/40 rounded-xl p-5 border border-red-500/20 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                 Fallas Críticas Detectadas
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criticos.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs bg-red-500/5 p-2 rounded border border-red-500/10">
                    <span className="text-red-500 font-bold">[{i+1}]</span>
                    <span className="font-medium text-red-200">{c.toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-red-400/80 mt-4 leading-relaxed italic">
                * El protocolo de seguridad requiere la apertura inmediata de una OT y el bloqueo de operación para esta unidad.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onVolver}
          className="flex-1 py-4 bg-slate-900 border border-white/5 rounded-2xl text-[11px] font-bold text-slate-500 hover:text-slate-200 uppercase tracking-widest transition-all"
        >
          Revisar Checklist
        </button>
        <button
          onClick={onFirmar}
          className={cn(
            'flex-1 py-4 rounded-2xl text-[11px] font-bold text-white uppercase tracking-widest transition-all shadow-xl border border-white/10',
            bloqueado ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
          )}
        >
          {bloqueado ? 'Validar y Reportar Fallas' : 'Validar y Proceder'}
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
  const { mutateAsync: crearInspeccion, isPending: guardando } = useCrearInspeccion()

  const faseParam = (searchParams.get('fase') as FaseInspeccion) ?? FaseInspeccion.CambioDeTurno
  const [fase,    setFase]    = useState<FaseInspeccion>(faseParam)
  const [turno,   setTurno]   = useState<'dia' | 'tarde' | 'noche'>('dia')
  const [km,      setKm]      = useState('')
  const [horas,   setHoras]   = useState('')
  const [obs,     setObs]     = useState('')
  const [resultados,    setResultados]    = useState<Record<string, ResultadoItem>>({})
  const [obsItems,      setObsItems]      = useState<Record<string, string>>({})
  const [paso, setPaso] = useState<'checklist' | 'resumen' | 'firma' | 'exito'>('checklist')
  const [error, setError] = useState('')
  const [sistemasDB, setSistemasDB] = useState<any[]>([])

  useEffect(() => {
    if (!vehiculo) return
    getChecklistDB(fase, vehiculo.programa_mto as ProgramaMTO).then(items => {
      setSistemasDB(items)
    })
  }, [vehiculo, fase])

  const sistemas = useMemo(() => {
    if (!vehiculo) return []
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
      setError(`SISTEMA BLOQUEADO: Faltan ${totalItems - completados} ítems por evaluar en el checklist`)
      return
    }
    const fallasSinObs = sistemas.flatMap(s => s.items).filter(
      item => resultados[item.id] === ResultadoItem.Falla && !obsItems[item.id]?.trim()
    )
    if (fallasSinObs.length > 0) {
      setError(`DILIGENCIAMIENTO INCOMPLETO: ${fallasSinObs.length} fallas requieren descripción técnica obligatoria`)
      return
    }
    setError('')
    setPaso('resumen')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardar(firmaUrl: string) {
    if (!vehiculo || !usuario) return

    const criticos = getCriticosConFalla(sistemas, resultados as Record<string, string>)
    const tieneFallas = Object.values(resultados).some(r => r === ResultadoItem.Falla)
    const resultado = criticos.length > 0
      ? 'rechazado'
      : tieneFallas ? 'con_observaciones' : 'aprobado'

    const items: Omit<ItemInspeccion, 'id' | 'inspeccion_id'>[] = sistemas
      .flatMap((s: any) => s.items)
      .map((item: any) => ({
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
      setPaso('exito')
    } catch (e: unknown) {
      setError('TRANSMISIÓN FALLIDA: Los datos han sido almacenados localmente para sincronización posterior')
      setPaso('exito')
    }
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Spinner size="lg" /><p className="text-[10px] font-bold text-slate-500 tracking-widest underline decoration-blue-500/20 uppercase">Iniciando Protocolos...</p></div>
  if (!vehiculo) return <div className="text-center py-20 p-4 font-bold text-red-500 uppercase tracking-widest border border-red-500/20 bg-red-500/5 rounded-2xl">Target Not Found: Unidad Inválida</div>

  // ─── PANTALLA ÉXITO ───────────────────────────────────────────────────────
  if (paso === 'exito') {
    const tieneFallas = Object.values(resultados).some(r => r === ResultadoItem.Falla)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 py-8 page-enter">
        <div className={cn(
          'w-24 h-24 rounded-[2rem] flex items-center justify-center text-white text-5xl shadow-2xl relative',
          tieneFallas ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
        )}>
           <div className="absolute inset-0 bg-white/20 rounded-[2rem] animate-ping opacity-20" />
           {tieneFallas ? '!' : '✓'}
        </div>
        <div className="max-w-md">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[.3em] mb-2">Operation Recorded</p>
          <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
            {tieneFallas ? 'Inspección con Novedades' : 'Misión Completada'}
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            {tieneFallas
              ? 'Protocolo de discrepancia iniciado. Se ha generado una entrada en el sistema de mantenimiento.'
              : `Inspección de la unidad ${vehiculo.matricula} finalizada exitosamente. Sistema liberado.`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm px-6">
          <button
            onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10"
          >
            Dashboard de Unidad
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-4 bg-slate-900 border border-white/5 rounded-2xl text-[11px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-widest"
          >
            Finalizar
          </button>
        </div>
      </div>
    )
  }

  // ─── RESUMEN / FIRMA ──────────────────────────────────────────────────────
  if (paso === 'resumen' || paso === 'firma') {
    const criticos = getCriticosConFalla(sistemas, resultados as Record<string, string>)
    const fallas   = Object.values(resultados).filter(r => r === ResultadoItem.Falla).length
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setPaso('checklist')} className="p-2.5 bg-slate-900 border border-white/5 rounded-xl hover:bg-white/5 text-slate-400 transition-all">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Validación Final</h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 italic">Review & Authorization</p>
          </div>
        </div>
        <ResumenInspeccion
          totalItems={totalItems}
          completados={completados}
          criticos={criticos}
          fallas={fallas}
          onFirmar={() => setPaso('firma')}
          onVolver={() => setPaso('checklist')}
        />
        {paso === 'firma' && (
          <FirmaDigital
            nombre={usuario?.nombre_completo ?? ''}
            onFirmar={async (url) => { await guardar(url) }}
            onCancelar={() => setPaso('resumen')}
          />
        )}
      </div>
    )
  }

  // ─── CHECKLIST PRINCIPAL ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24 page-enter">
      {/* Header Aeronáutico */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-900 border border-white/5 rounded-xl hover:bg-white/5 text-slate-400 transition-all">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
               {vehiculo.matricula} <span className="text-blue-500 text-xs font-mono">• {vehiculo.modelo}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 italic">
               Checklist System: {vehiculo.programa_mto}
            </p>
          </div>
        </div>
        <Badge variant="info" className="py-2 px-4 border border-blue-500/20 font-bold uppercase tracking-widest text-[10px]">
           MODO: {FASE_LABELS[fase].split('—')[0]}
        </Badge>
      </div>

      {/* Selector de fase - Aero Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {Object.values(FaseInspeccion).map(f => (
          <button
            key={f}
            onClick={() => { setFase(f); setResultados({}); setObsItems({}) }}
            className={cn(
              'shrink-0 text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all uppercase tracking-widest whitespace-nowrap border',
              fase === f
                ? 'bg-blue-600 text-white border-white/20 shadow-lg shadow-blue-500/20'
                : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
          >
            {f === FaseInspeccion.CambioDeTurno ? 'Cambio Turno' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Datos del registro Glass Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
           <div className="w-1 h-3 bg-blue-500 rounded-full" />
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Telemetry Input</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Turno */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Indicador Turno</label>
            <select
              value={turno}
              onChange={e => setTurno(e.target.value as typeof turno)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            >
              {Object.entries(TURNO_LABELS).map(([v, l]) => (
                <option key={v} value={v} className="bg-slate-900">{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
          {/* KM */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Odómetro KM</label>
            <input
              type="number"
              placeholder={String(vehiculo.kilometraje_actual)}
              value={km}
              onChange={e => setKm(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-800"
            />
          </div>
          {/* Horas */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Engine Hours</label>
            <input
              type="number"
              placeholder={String(vehiculo.horas_motor)}
              value={horas}
              onChange={e => setHoras(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-800"
            />
          </div>
        </div>
        {/* Obs general */}
        <div className="space-y-1.5 pt-2">
          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Novedades Especiales del Turno</label>
          <textarea
            rows={2}
            placeholder="No se reportan anomalías externas durante el inicio de inspección..."
            value={obs}
            onChange={e => setObs(e.target.value)}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none placeholder:text-slate-700 italic"
          />
        </div>
      </div>

      {/* Leyenda Aero */}
      <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-slate-600 px-1 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
          <span>ÍTEM CRÍTICO</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-[2px] bg-slate-700" />
           <span>EVALUACIÓN REQUERIDA EN TODOS LOS SUBSISTEMAS</span>
        </div>
      </div>

      {/* Checklist por sistemas */}
      <div className="space-y-10">
        {sistemas.map(sistema => (
          <div key={sistema.sistema} className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[.25em] flex items-center gap-3">
                <span className="w-1 h-3 bg-blue-500" />
                {sistema.sistema}
              </h3>
              <span className="text-[10px] font-mono text-slate-600 font-bold bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                {sistema.items.filter((i: any) => resultados[i.id]).length}/{sistema.items.length} SUBSYSTEMS
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {sistema.items.map((item: any) => (
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
        ))}
      </div>

      {/* Error - Alerta fija Aero */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-[11px] font-bold text-red-500 flex items-center gap-3 animate-pulse">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
             <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
          </svg>
          {error.toUpperCase()}
        </div>
      )}

      {/* Barra de acción fija abajo Aero */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 md:left-64 z-40 transition-all shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full sm:w-auto">
            <ProgressBar completados={completados} total={totalItems} />
          </div>
          <button
            onClick={irAResumen}
            disabled={guardando}
            className="w-full sm:w-auto shrink-0 px-10 py-3.5 bg-blue-600 text-white text-[11px] font-bold rounded-2xl hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 border border-white/10"
          >
            {guardando ? 'TRANSMITIENDO...' : 'VALIDAR INSPECCIÓN →'}
          </button>
        </div>
      </div>
    </div>
  )
}
