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

function InspeccionCard({ insp, canFirmar }: { insp: Inspeccion; canFirmar: boolean }) {
  const { mutate: firmar, isPending } = useFirmarInspeccion()
  const rs = RESULTADO_STYLE[insp.resultado as string] ?? RESULTADO_STYLE.aprobado

  return (
    <div className={`glass-panel rounded-2xl border transition-all ${
      insp.resultado === 'rechazado' ? 'border-red-500/20' :
      insp.resultado === 'con_observaciones' ? 'border-amber-500/20' :
      'border-white/5'
    }`}>
      <div className="flex items-start justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Fecha */}
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                          flex flex-col items-center justify-center shrink-0">
            <p className="text-[9px] text-blue-400 uppercase tracking-widest leading-none">
              {formatDate(insp.fecha).split(' ')[1] ?? ''}
            </p>
            <p className="text-sm font-bold text-white font-mono leading-none">
              {new Date(insp.fecha).getDate().toString().padStart(2, '0')}
            </p>
          </div>
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
        <div className="space-y-3">
          {filtradas.map(i => (
            <InspeccionCard key={i.id} insp={i} canFirmar={canFirmar} />
          ))}
        </div>
      )}
    </div>
  )
}
