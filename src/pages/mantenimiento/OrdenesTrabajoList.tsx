import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useOrdenesAbiertas } from '@/hooks/useMantenimiento'
import { useScope } from '@/hooks/useScope'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { OrdenTrabajo } from '@/core/types'

const PRIORIDAD: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  alta:  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',    bar: 'bg-red-500' },
  media: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30',  bar: 'bg-amber-500' },
  baja:  { bg: 'bg-slate-700/20',  text: 'text-slate-400',  border: 'border-white/10',      bar: 'bg-slate-500' },
}

const ESTADO: Record<string, { bg: string; text: string; border: string; label: string }> = {
  abierta:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'ABIERTA' },
  en_proceso: { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    label: 'EN PROCESO' },
  cerrada:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'CERRADA' },
  cancelada:  { bg: 'bg-slate-700/20',   text: 'text-slate-400',   border: 'border-white/10',       label: 'CANCELADA' },
}

function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones', 'selector'],
    queryFn: async () => {
      const { data } = await supabase
        .from('estaciones')
        .select('id, nombre, codigo_iata')
        .eq('activa', true)
        .order('nombre')
      return data ?? []
    },
  })
}

export default function OrdenesTrabajoList() {
  const navigate  = useNavigate()
  const { esNacional, estacionId } = useScope()

  const [filtroEstacionSel, setFiltroEstacionSel] = useState<string | null>(null)
  const [filtroTipo,        setFiltroTipo]        = useState('todos')

  const estacionFiltro = esNacional ? filtroEstacionSel : estacionId

  const { data: ordenes, isLoading } = useOrdenesAbiertas(estacionFiltro)
  const { data: estaciones }         = useEstaciones()

  const filtradas = ordenes?.filter(ot =>
    filtroTipo === 'todos' || ot.tipo === filtroTipo
  )

  const stats = {
    total:   ordenes?.length ?? 0,
    alta:    ordenes?.filter(o => o.prioridad === 'alta').length ?? 0,
    proceso: ordenes?.filter(o => o.estado === 'en_proceso').length ?? 0,
  }

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Job Control Console
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            MANTENIMIENTO DE FLOTA
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {isLoading ? 'Cargando...' : `${stats.total} órdenes activas en sistema`}
          </p>
        </div>
        <button onClick={() => navigate('/mantenimiento/nueva')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                     text-white text-xs font-bold px-4 py-2.5 rounded-xl
                     transition-all shadow-lg shadow-blue-600/20 uppercase tracking-wide">
          GENERAR NUEVA OT
        </button>
      </div>

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Órdenes activas', v: stats.total,   c: 'text-white' },
            { l: 'Prioridad ALTA',  v: stats.alta,    c: stats.alta > 0 ? 'text-red-400' : 'text-slate-500' },
            { l: 'En proceso',      v: stats.proceso, c: 'text-blue-400' },
          ].map(m => (
            <div key={m.l} className="glass-panel rounded-xl p-3 border border-white/5 text-center">
              <p className={`text-2xl font-bold font-mono ${m.c}`}>{m.v}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{m.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {esNacional && (
          <select value={filtroEstacionSel ?? ''}
            onChange={e => setFiltroEstacionSel(e.target.value || null)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-sm
                       text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30">
            <option value="">Todas las estaciones</option>
            {estaciones?.map((e: any) => (
              <option key={e.id} value={e.id}>{e.codigo_iata} — {e.nombre}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1 bg-slate-950 border border-white/5 rounded-xl p-1">
          {[
            { v: 'todos',          l: 'TODOS' },
            { v: 'correctivo',     l: 'CORRECTIVO' },
            { v: 'preventivo',     l: 'PREVENTIVO' },
            { v: 'post_accidente', l: 'POST-ACC.' },
          ].map(f => (
            <button key={f.v} onClick={() => setFiltroTipo(f.v)}
              className={`px-3 py-1.5 text-[9px] rounded-lg font-bold uppercase tracking-wider
                         transition-all ${
                filtroTipo === f.v
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de OTs */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg"/></div>
      ) : !filtradas?.length ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20
                          flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" className="text-emerald-400">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
            </svg>
          </div>
          <p className="text-slate-400 text-sm uppercase tracking-widest">Sistema nominal</p>
          <p className="text-slate-600 text-xs mt-1">Sin órdenes de trabajo activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(ot => {
            const p  = PRIORIDAD[ot.prioridad] ?? PRIORIDAD.baja
            const es = ESTADO[ot.estado]       ?? ESTADO.abierta
            const vehiculo = ot.vehiculo as any
            const estacion = vehiculo?.estacion

            return (
              <div key={ot.id}
                className="glass-panel rounded-2xl border border-white/5
                           hover:border-white/10 transition-all group cursor-pointer"
                onClick={() => navigate(`/mantenimiento/${ot.id}`)}>

                {/* Barra lateral de prioridad */}
                <div className="flex">
                  <div className={`w-1 rounded-l-2xl shrink-0 ${p.bar}`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {(ot as any).numero_ot || '—'}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border
                                         uppercase tracking-wider ${p.bg} ${p.text} ${p.border}`}>
                          PRIORIDAD {ot.prioridad?.toUpperCase()}
                        </span>
                        {esNacional && estacion && (
                          <span className="text-[9px] font-bold font-mono bg-blue-500/10
                                           text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                            {estacion.codigo_iata}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                                       uppercase tracking-wide shrink-0 ${es.bg} ${es.text} ${es.border}`}>
                        {es.label}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-200 uppercase tracking-wide
                                 group-hover:text-white transition-colors mb-1">
                      {ot.descripcion}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-wide">
                      <span className="text-blue-400/70">{ot.tipo}</span>
                      {vehiculo?.matricula && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="font-mono">{vehiculo.matricula}</span>
                        </>
                      )}
                      {(ot as any).fecha_programada && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span>ETA: {formatDate((ot as any).fecha_programada)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acceder */}
                  <div className="flex items-center pr-4">
                    <div className="flex items-center gap-1 text-[9px] text-slate-600
                                   group-hover:text-blue-400 transition-colors uppercase tracking-wider">
                      ACCEDER
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
