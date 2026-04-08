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
  const { mutateAsync: crearInspeccion, isPending: guardando } = useCrearInspeccion()

  // Fase desde query param, default cambio_turno
  const faseParam = (searchParams.get('fase') as FaseInspeccion) ?? FaseInspeccion.CambioDeTurno

  // Estado del formulario
  const [fase,    setFase]    = useState<FaseInspeccion>(faseParam)
  const [turno,   setTurno]   = useState<'dia' | 'tarde' | 'noche'>('dia')
  const [km,      setKm]      = useState('')
  const [horas,   setHoras]   = useState('')
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
    const tieneFallas = Object.values(resultados).some(r => r === ResultadoItem.Falla)
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-4 py-8">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl',
          tieneFallas ? 'bg-amber-500' : 'bg-green-500'
        )}>
          {tieneFallas ? '⚠' : '✓'}
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">
            {tieneFallas ? 'Inspección registrada con fallas' : 'Inspección completada'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {tieneFallas
              ? 'Se ha generado una discrepancia. El vehículo queda fuera de servicio.'
              : `Vehículo ${vehiculo.matricula} liberado al servicio.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}
            className="px-5 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-medium hover:bg-sei-700 transition-colors"
          >
            Ver vehículo
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
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
            <h1 className="text-sm font-semibold text-gray-900">{vehiculo.matricula}</h1>
            <p className="text-xs text-gray-400">{vehiculo.modelo} · {vehiculo.programa_mto}</p>
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
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos del registro</p>
        <div className="grid grid-cols-3 gap-2">
          {/* Turno */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Turno</label>
            <select
              value={turno}
              onChange={e => setTurno(e.target.value as typeof turno)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
            >
              {Object.entries(TURNO_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l.split(' ')[0]}</option>
              ))}
            </select>
          </div>
          {/* KM */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Km actuales</label>
            <input
              type="number"
              placeholder={String(vehiculo.kilometraje_actual)}
              value={km}
              onChange={e => setKm(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
            />
          </div>
          {/* Horas */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Horas motor</label>
            <input
              type="number"
              placeholder={String(vehiculo.horas_motor)}
              value={horas}
              onChange={e => setHoras(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sei-400"
            />
          </div>
        </div>
        {/* Obs general */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Observaciones generales</label>
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

      {/* Checklist por sistemas */}
      {sistemas.map(sistema => (
        <div key={sistema.sistema} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide px-1">
              {sistema.sistema}
            </h3>
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
      ))}

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
