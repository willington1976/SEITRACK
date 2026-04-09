import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useInspecciones, useFirmarInspeccion } from '@/hooks/useInspecciones'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatDateTime } from '@/lib/utils'
import { FaseInspeccion, Rol } from '@/core/enums'
import type { Inspeccion } from '@/core/types'

const RESULTADO_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  aprobado:          { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'APROBADO' },
  con_observaciones: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   label: 'CON OBS.' },
  rechazado:         { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'RECHAZADO' },
}

const FASE_LABEL: Record<string, string> = {
  cambio_turno: 'CAMBIO DE TURNO',
  f0: 'F0 — DIARIA', f1: 'F1', f2: 'F2', f3: 'F3',
}

function InspeccionCard({ insp, canFirmar, compact = false }: { insp: Inspeccion; canFirmar: boolean; compact?: boolean }) {
  const { mutate: firmar, isPending } = useFirmarInspeccion()
  const rs = RESULTADO_STYLE[insp.resultado as string] ?? RESULTADO_STYLE.aprobado

  return (
    <div className={compact ? '' : `glass-panel rounded-2xl border transition-all ${
      insp.resultado === 'rechazado' ? 'border-red-500/20' :
      insp.resultado === 'con_observaciones' ? 'border-amber-500/20' :
      'border-white/5'
    }`}>
      <div className={`flex items-start justify-between ${compact ? 'px-5 py-3' : 'p-4 border-b border-white/5'}`}>
        <div className="flex items-center gap-3">
          {/* Fecha — ocultar en modo compact */}
          {!compact && (
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                            flex flex-col items-center justify-center shrink-0">
              <p className="text-[9px] text-blue-400 uppercase tracking-widest leading-none">
                {formatDate(insp.fecha).split(' ')[1] ?? ''}
              </p>
              <p className="text-sm font-bold text-white font-mono leading-none">
                {new Date(insp.fecha).getDate().toString().padStart(2, '0')}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wide">
              {FASE_LABEL[insp.fase] ?? insp.fase}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
              TURNO {insp.turno} · REF: {insp.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                           uppercase tracking-widest ${rs.bg} ${rs.text} ${rs.border}`}>
            {rs.label}
          </span>
          {insp.liberado_servicio && (
            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400
                             border border-emerald-500/20 px-2 py-1 rounded-lg uppercase tracking-widest">
              CLEAR FOR OPS
            </span>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 px-4 py-3">
        {[
          { l: 'REGISTRO KM',   v: insp.km_al_momento?.toLocaleString('es-CO') ?? '—' },
          { l: 'HORAS MOTOR',   v: insp.horas_al_momento?.toLocaleString('es-CO') ?? '—' },
          { l: 'TÉCNICO/INSP.', v: (insp.inspector as any)?.nombre_completo?.split(' ')[0] ?? '—' },
          { l: 'UTC EST.',      v: formatDateTime(insp.created_at).split(' ')[0] ?? '—' },
        ].map(m => (
          <div key={m.l}>
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{m.l}</p>
            <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{m.v}</p>
          </div>
        ))}
      </div>

      {/* Observaciones */}
      {insp.observaciones_generales && (
        <div className="px-4 pb-3">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
            Observaciones técnicas
          </p>
          <p className="text-xs text-slate-400 italic">"{insp.observaciones_generales}"</p>
        </div>
      )}

      {/* Firma */}
      {insp.fecha_firma && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">
            Bitácora validada · {formatDateTime(insp.fecha_firma)}
          </p>
        </div>
      )}

      {/* Botón firmar */}
      {canFirmar && !insp.firma_jefe && (
        <div className="px-4 pb-4">
          <button
            onClick={() => firmar({ inspeccionId: insp.id, vehiculoId: (insp as any).vehiculo_id })}
            disabled={isPending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs
                       font-bold rounded-xl transition-all uppercase tracking-widest
                       disabled:opacity-50"
          >
            {isPending ? 'Firmando...' : '✓ Firmar y liberar al servicio'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Agrupación mensual ──────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function GruposMensuales({ inspecciones, canFirmar }: { inspecciones: any[]; canFirmar: boolean }) {
  // Agrupar por año-mes
  const grupos = useMemo(() => {
    const map: Record<string, { label: string; items: any[]; esActual: boolean }> = {}
    const hoy = new Date()

    for (const i of inspecciones) {
      const d    = new Date(i.fecha)
      const key  = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const esActual = d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth()
      if (!map[key]) map[key] = {
        label: MESES[d.getMonth()] + ' ' + d.getFullYear(),
        items: [],
        esActual,
      }
      map[key].items.push(i)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [inspecciones])

  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const hoy = new Date()
    const keyActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0')
    return new Set([keyActual])
  })

  function toggle(key: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {grupos.map(([key, grupo]) => {
        const open = abiertos.has(key)
        const rechazadas  = grupo.items.filter(i => i.resultado === 'rechazado').length
        const observadas  = grupo.items.filter(i => i.resultado === 'con_observaciones').length
        const aprobadas   = grupo.items.filter(i => i.resultado === 'aprobado').length

        return (
          <div key={key} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            {/* Cabecera del mes */}
            <button onClick={() => toggle(key)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/2
                         transition-all text-left group">

              {/* Indicador mes actual */}
              {grupo.esActual && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0"/>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-blue-300 transition-colors">
                    {grupo.label}
                  </p>
                  {grupo.esActual && (
                    <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400
                                     border border-blue-500/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      MES ACTUAL
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">
                  {grupo.items.length} inspecciones registradas
                </p>
              </div>

              {/* Mini resumen del mes */}
              <div className="flex items-center gap-2 shrink-0">
                {rechazadas > 0 && (
                  <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                   border border-red-500/20 px-2 py-1 rounded-lg">
                    {rechazadas} ✗
                  </span>
                )}
                {observadas > 0 && (
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400
                                   border border-amber-500/20 px-2 py-1 rounded-lg">
                    {observadas} ⚠
                  </span>
                )}
                <span className="text-[9px] font-mono text-slate-500">
                  {aprobadas}/{grupo.items.length}
                </span>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
                  className={'text-slate-600 transition-transform ' + (open ? 'rotate-90' : '')}>
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                </svg>
              </div>
            </button>

            {/* Inspecciones del mes — agrupadas por día */}
            {open && (
              <div className="border-t border-white/5">
                <DiasDelMes inspecciones={grupo.items} canFirmar={canFirmar}/>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DiasDelMes({ inspecciones, canFirmar }: { inspecciones: any[]; canFirmar: boolean }) {
  // Agrupar por día
  const dias = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const i of inspecciones) {
      const key = i.fecha
      if (!map[key]) map[key] = []
      map[key].push(i)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [inspecciones])

  return (
    <div className="divide-y divide-white/5">
      {dias.map(([fecha, items]) => {
        const d = new Date(fecha + 'T12:00:00')
        const rechazado = items.some(i => i.resultado === 'rechazado')
        const conObs    = items.some(i => i.resultado === 'con_observaciones')

        return (
          <div key={fecha}>
            {/* Fecha del día */}
            <div className={'flex items-center gap-3 px-5 py-2.5 ' + (rechazado ? 'bg-red-500/5' : conObs ? 'bg-amber-500/5' : 'bg-white/1')}>
              <div className={'w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 ' + (rechazado ? 'bg-red-500/20 border border-red-500/20' : conObs ? 'bg-amber-500/20 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/10')}>
                <p className={'text-[8px] uppercase tracking-widest leading-none ' + (rechazado ? 'text-red-400' : conObs ? 'text-amber-400' : 'text-blue-400')}>
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]}
                </p>
                <p className={'text-sm font-bold font-mono leading-tight ' + (rechazado ? 'text-red-300' : conObs ? 'text-amber-300' : 'text-white')}>
                  {String(d.getDate()).padStart(2, '0')}
                </p>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {items.length} inspección{items.length > 1 ? 'es' : ''}
              </p>
              {rechazado && <span className="text-[9px] font-bold text-red-400 ml-auto">● FALLA DETECTADA</span>}
              {!rechazado && conObs && <span className="text-[9px] font-bold text-amber-400 ml-auto">◐ CON OBSERVACIONES</span>}
              {!rechazado && !conObs && <span className="text-[9px] font-bold text-emerald-400 ml-auto">✓ NOMINAL</span>}
            </div>

            {/* Cards de inspección del día — compactas */}
            <div className="divide-y divide-white/5">
              {items.map((insp: any) => (
                <InspeccionCard key={insp.id} insp={insp} canFirmar={canFirmar} compact/>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function InspeccionList() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const navigate       = useNavigate()
  const usuario        = useAuthStore(s => s.usuario)
  const { data: vehiculo } = useVehiculo(vehiculoId!)
  const { data: inspecciones, isLoading } = useInspecciones(vehiculoId!)

  const rol       = usuario?.rol as Rol
  const canFirmar = rol === Rol.JefeEstacion || rol === Rol.JefeRegional || rol === Rol.JefeNacional
  const canCreate = rol === Rol.Bombero || rol === Rol.JefeEstacion || rol === Rol.ODMA

  // Fases visibles por rol — igual que en el form
  const fasesVisibles = rol === Rol.Bombero
    ? [FaseInspeccion.CambioDeTurno, FaseInspeccion.F0]
    : rol === Rol.ODMA
    ? [FaseInspeccion.F1, FaseInspeccion.F2, FaseInspeccion.F3]
    : Object.values(FaseInspeccion)

  const faseFiltro = fasesVisibles[0]

  // Filtrar inspecciones según fases visibles del rol
  const filtradas = inspecciones?.filter(i =>
    fasesVisibles.includes(i.fase as FaseInspeccion)
  )

  // URL para nueva inspección según rol
  function urlNuevaInspeccion() {
    const fase = rol === Rol.ODMA ? FaseInspeccion.F1 : FaseInspeccion.CambioDeTurno
    return `/vehiculos/${vehiculoId}/inspecciones/nueva?fase=${fase}`
  }

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Logbook técnico
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white uppercase tracking-tight">
              HISTORIAL DE INSPECCIONES
            </h1>
            {vehiculo && (
              <span className="text-sm font-bold font-mono bg-blue-500/20 text-blue-400
                               border border-blue-500/30 px-2 py-0.5 rounded">
                {vehiculo.matricula}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {isLoading ? 'Cargando...' : `Logbook técnico: ${filtradas?.length ?? 0} entradas registradas`}
          </p>
        </div>

        {canCreate && (
          <button onClick={() => navigate(urlNuevaInspeccion())}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                       text-white text-xs font-bold px-4 py-2.5 rounded-xl
                       transition-all shadow-lg shadow-blue-600/20 uppercase tracking-wide">
            + NUEVA INSPECCIÓN
          </button>
        )}
      </div>

      {/* Filtros de fase — solo los del rol */}
      <div className="flex gap-1.5 flex-wrap">
        {fasesVisibles.map(f => (
          <span key={f}
            className="text-[9px] font-bold px-3 py-1.5 rounded-lg border
                       bg-blue-500/10 text-blue-400 border-blue-500/20
                       uppercase tracking-widest">
            {FASE_LABEL[f] ?? f}
          </span>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg"/></div>
      ) : !filtradas?.length ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest">
            Sin inspecciones registradas
          </p>
          {canCreate && (
            <button onClick={() => navigate(urlNuevaInspeccion())}
              className="mt-4 text-blue-400 text-xs hover:underline uppercase tracking-widest">
              Registrar primera inspección →
            </button>
          )}
        </div>
      ) : (
        <GruposMensuales inspecciones={filtradas} canFirmar={canFirmar} />
      )}
    </div>
  )
}
