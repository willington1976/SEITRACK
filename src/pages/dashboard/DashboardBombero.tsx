// ─── Dashboard Bombero — "Mi Turno" ──────────────────────────────────────────
// Vista operativa simple para el maquinista de turno
// Foco: estado de su MRE, turno actual, acciones rápidas

import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useVehiculos } from '@/hooks/useVehiculos'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatKm, formatHoras } from '@/lib/utils'
import { TURNO_LABELS } from '@/lib/constants'

// ─── Turno actual ─────────────────────────────────────────────────────────────

function getTurnoActual(): 'dia' | 'tarde' | 'noche' {
  const h = new Date().getHours()
  if (h >= 6  && h < 14) return 'dia'
  if (h >= 14 && h < 22) return 'tarde'
  return 'noche'
}

// ─── Hook última inspección del turno ────────────────────────────────────────

function useUltimaInspeccionHoy(estacionId: string | null) {
  return useQuery({
    queryKey: ['bombero', 'ultima-inspeccion', estacionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('inspecciones')
        .select(`
          id, fase, turno, resultado, created_at, liberado_servicio,
          vehiculo:vehiculos!inner(matricula, estacion_id)
        `)
        .eq('vehiculo.estacion_id', estacionId!)
        .eq('fecha', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  })
}

function useDiferidosActivos(estacionId: string | null) {
  return useQuery({
    queryKey: ['bombero', 'diferidos', estacionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ordenes_trabajo')
        .select(`
          id, numero_ot, motivo_diferido, descripcion,
          vehiculo:vehiculos!inner(matricula, estacion_id)
        `)
        .eq('vehiculo.estacion_id', estacionId!)
        .not('motivo_diferido', 'is', null)
        .in('estado', ['en_proceso', 'abierta'])
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 60 * 5,
  })
}

function useVehiculosPendientesRecibo(estacionId: string | null) {
  return useQuery({
    queryKey: ['bombero', 'recibo-pendiente', estacionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehiculos')
        .select('id, matricula, modelo')
        .eq('estado', 'pendiente_verificacion')
        .eq('estacion_id', estacionId!)
      return data ?? []
    },
    enabled: !!estacionId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  })
}

// ─── Estilos estado vehículo ──────────────────────────────────────────────────

const ESTADO_V: Record<string, {
  bg: string; text: string; border: string; dot: string; label: string; glow: string
}> = {
  operativo:              { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'OPERATIVO',           glow: 'shadow-emerald-500/20' },
  en_mantenimiento:       { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   label: 'EN MANTENIMIENTO',   glow: 'shadow-amber-500/20' },
  fuera_de_servicio:      { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'FUERA DE SERVICIO',  glow: 'shadow-red-500/20' },
  pendiente_verificacion: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-400',  label: 'PEND. VERIFICACIÓN', glow: 'shadow-purple-500/20' },
  en_inspeccion:          { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400',    label: 'EN INSPECCIÓN',      glow: 'shadow-blue-500/20' },
}

const RESULTADO_C: Record<string, string> = {
  aprobado:      'text-emerald-400',
  con_observaciones: 'text-amber-400',
  rechazado:     'text-red-400',
}

const TURNO_ICON: Record<string, string> = {
  dia:   '☀️',
  tarde: '🌤',
  noche: '🌙',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardBombero() {
  const navigate   = useNavigate()
  const usuario    = useAuthStore(s => s.usuario)
  const estacionId = usuario?.estacion_id ?? null
  const turnoActual = getTurnoActual()

  const { data: vehiculos,    isLoading: loadingV }   = useVehiculos(estacionId)
  const { data: inspHoy,      isLoading: loadingI }   = useUltimaInspeccionHoy(estacionId)
  const { data: diferidos }                           = useDiferidosActivos(estacionId)
  const { data: pendRecibo }                          = useVehiculosPendientesRecibo(estacionId)

  const estacion = usuario?.estacion as any
  const nombre   = usuario?.nombre_completo?.split(' ')[0] ?? ''

  const hayReciboPendiente = (pendRecibo?.length ?? 0) > 0
  const hayDiferidos       = (diferidos?.length ?? 0) > 0
  const inspeccionHoyHecha = inspHoy?.some(i =>
    i.turno === turnoActual && (i.fase === 'cambio_turno' || i.fase === 'f0')
  )

  return (
    <div className="relative space-y-5">
      {/* Iluminación por turno */}
      <div className={`absolute top-0 right-0 w-96 h-96 blur-[120px] pointer-events-none ${
        turnoActual === 'noche' ? 'bg-blue-500/5' :
        turnoActual === 'tarde' ? 'bg-amber-500/5' :
        'bg-yellow-500/5'
      }`}/>

      {/* Header — saludo de turno */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Station Control Node
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {TURNO_ICON[turnoActual]} TURNO {turnoActual.toUpperCase()}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {formatDate(new Date())} · {estacion?.codigo_iata} — {estacion?.aeropuerto ?? estacion?.nombre}
          </p>
        </div>

        {/* Badge inspección del turno */}
        <div className={`glass-panel px-3 py-2 rounded-xl border text-center ${
          inspeccionHoyHecha
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${
            inspeccionHoyHecha ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {inspeccionHoyHecha ? '✓ F0 REALIZADA' : '⚠ F0 PENDIENTE'}
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider">
            {TURNO_LABELS[turnoActual]}
          </p>
        </div>
      </div>

      {/* Alerta recibo pendiente — máxima prioridad */}
      {hayReciboPendiente && (
        <button
          onClick={() => navigate('/inspeccion-recibo')}
          className="w-full glass-panel rounded-2xl border border-purple-500/40
                     bg-purple-500/5 p-4 flex items-center gap-4 hover:bg-purple-500/10
                     transition-all group">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30
                          flex items-center justify-center shrink-0 animate-pulse">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="text-purple-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-purple-300">
              ¡Verificación de recibo pendiente!
            </p>
            <p className="text-[10px] text-purple-400/70 mt-0.5 uppercase tracking-wide">
              La ODMA completó el trabajo — debes inspeccionar y liberar al servicio
            </p>
          </div>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
            className="text-purple-500 group-hover:text-purple-300 transition-colors shrink-0">
            <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      )}

      {/* Diferidos activos */}
      {hayDiferidos && (
        <div className="glass-panel rounded-2xl border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400"/>
            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
              {diferidos!.length} diferido{diferidos!.length > 1 ? 's' : ''} activo{diferidos!.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-2">
            {diferidos!.map((d: any) => (
              <div key={d.id} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-slate-500 shrink-0">{(d.vehiculo as any)?.matricula}</span>
                <span className="text-slate-400 truncate">{d.descripcion}</span>
                <span className="text-[9px] text-amber-400 shrink-0 uppercase tracking-wide">
                  {d.motivo_diferido?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado de la flota asignada */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
              Estado de Flota Asignada
            </p>
            <p className="text-sm font-bold text-white">
              {vehiculos?.length ?? 0} Unidades en Red
            </p>
          </div>
          <button onClick={() => navigate('/vehiculos')}
            className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest">
            Acceder a Flota →
          </button>
        </div>

        {loadingV ? (
          <div className="flex justify-center py-8"><Spinner size="sm"/></div>
        ) : !vehiculos?.length ? (
          <p className="text-slate-500 text-sm text-center py-8">Sin vehículos asignados</p>
        ) : (
          <div className="divide-y divide-white/5">
            {vehiculos.map(v => {
              const es = ESTADO_V[v.estado] ?? ESTADO_V.operativo
              return (
                <button key={v.id}
                  onClick={() => navigate(`/vehiculos/${v.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4
                             hover:bg-white/2 transition-all group text-left">

                  {/* Ícono vehículo */}
                  <div className={`w-10 h-10 rounded-xl ${es.bg} border ${es.border}
                                   flex items-center justify-center shrink-0`}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
                      className={es.text}>
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-white text-base
                                 group-hover:text-blue-300 transition-colors">
                      {v.matricula}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                      {v.modelo} · {v.anio}
                    </p>
                  </div>

                  {/* Odómetro y horas */}
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-xs font-mono text-slate-400">
                      {formatKm(v.kilometraje_actual)}
                    </p>
                    <p className="text-[10px] font-mono text-slate-600">
                      {formatHoras(v.horas_motor)}
                    </p>
                  </div>

                  {/* Estado */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
                                   shrink-0 ${es.bg} ${es.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${es.dot} ${
                      v.estado === 'operativo' ? 'animate-pulse' : ''
                    }`}/>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${es.text}`}>
                      {es.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Últimas inspecciones del turno */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
            Registro de actividad
          </p>
          <p className="text-sm font-bold text-white">Inspecciones de hoy</p>
        </div>

        {loadingI ? (
          <div className="flex justify-center py-6"><Spinner size="sm"/></div>
        ) : !inspHoy?.length ? (
          <div className="px-5 py-6 text-center">
            <p className="text-slate-500 text-xs uppercase tracking-widest">
              Sin inspecciones registradas hoy
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {inspHoy.map((i: any) => (
              <div key={i.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20
                                flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-blue-400 uppercase">
                    {i.fase === 'cambio_turno' ? 'CT' : i.fase.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">
                    {i.fase === 'cambio_turno' ? 'Cambio de Turno' : `Inspección ${i.fase.toUpperCase()}`}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                    Turno {i.turno} · {(i.vehiculo as any)?.matricula}
                  </p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide ${
                  RESULTADO_C[i.resultado] ?? 'text-slate-400'
                }`}>
                  {i.resultado?.replace('_', ' ')}
                </span>
                {i.liberado_servicio && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10
                                   border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                    CLEAR
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Command Center Shortcuts */}
      <div className="glass-panel rounded-2xl border border-white/5 p-4">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Command Center Shortcuts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: 'INSPEC F0',
              desc: 'F0 — Cambio de turno',
              to: '/inspecciones',
              color: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
              icon: '📋',
            },
            {
              label: 'LIBRO OP.',
              desc: 'Registro de novedades',
              to: '/libro-operacion',
              color: 'border-slate-700 bg-white/2 text-slate-400',
              icon: '📓',
            },
            ...(hayReciboPendiente ? [{
              label: 'RECIBO',
              desc: 'Verificar trabajo ODMA',
              to: '/inspeccion-recibo',
              color: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
              icon: '✓',
            }] : []),
          ].map(a => (
            <button key={a.label}
              onClick={() => navigate(a.to)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                         hover:opacity-80 text-left ${a.color}`}>
              <span className="text-lg leading-none">{a.icon}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">{a.label}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
