import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAVC, useFallasPorSistema } from '@/hooks/useReportes'
import { Spinner } from '@/components/ui/Spinner'
import { generarPDFAVC } from '@/lib/pdf'
import { format, subDays } from 'date-fns'
import { Rol } from '@/core/enums'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'

// ─── Utilidades ───────────────────────────────────────────────────────────────

function exportCSV(data: unknown[], nombre: string) {
  if (!data.length) return
  const keys   = Object.keys(data[0] as object)
  const header = keys.join(';')
  const rows   = data.map(row =>
    keys.map(k => String((row as Record<string, unknown>)[k] ?? '')).join(';')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${nombre}_${format(new Date(), 'yyyyMMdd')}.csv`
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── Hook de estructura regional ─────────────────────────────────────────────

function useRegionalesConEstaciones() {
  return useQuery({
    queryKey: ['regionales', 'con-estaciones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('regionales')
        .select('id, nombre, codigo, estaciones(id, nombre, codigo_iata, ciudad)')
        .order('nombre')
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ─── Celda con color ─────────────────────────────────────────────────────────

function NumCell({ v, warn, danger }: { v: number; warn?: boolean; danger?: boolean }) {
  const color = danger ? 'text-red-400 font-bold'
    : warn ? 'text-amber-400 font-semibold'
    : v > 0 ? 'text-slate-300' : 'text-slate-600'
  return <span className={`font-mono ${color}`}>{v}</span>
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportesAVC() {
  const usuario    = useAuthStore(s => s.usuario)
  const rol        = usuario?.rol as Rol
  const esNacional = rol === Rol.JefeNacional || rol === Rol.DSNA
  const esRegional = rol === Rol.JefeRegional

  const regionalId = (usuario?.estacion as any)?.regional_id ?? undefined

  const [desde, setDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [regionalFiltro, setRegionalFiltro] = useState<string | undefined>(
    esNacional ? undefined : regionalId
  )
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const { data: regionales } = useRegionalesConEstaciones()
  const { data: avc,    isLoading: loadingAVC } = useAVC({
    desde, hasta,
    regionalId: regionalFiltro,
  })
  const { data: fallas, isLoading: loadingF } = useFallasPorSistema(
    esNacional ? undefined : usuario?.estacion_id
  )

  // ─── Agrupar datos AVC por Regional → Estación → Vehículos ───────────────
  const avcAgrupado = useMemo(() => {
    if (!avc || !regionales) return []

    const mapa: Record<string, {
      regionalId:     string
      regionalNombre: string
      regionalCodigo: string
      estaciones: Record<string, {
        estacionNombre: string
        iata:           string
        ciudad:         string
        vehiculos:      typeof avc
      }>
    }> = {}

    for (const row of avc) {
      // Buscar a qué regional pertenece esta estación
      let regId = 'sin-regional'
      let regNom = 'Sin regional'
      let regCod = '??'
      let iata = row.estacion_nombre?.split(' ')[0] ?? '???'
      let ciudad = ''

      for (const reg of regionales) {
        const estaciones = (reg as any).estaciones ?? []
        const est = estaciones.find((e: any) =>
          e.nombre === row.estacion_nombre ||
          e.codigo_iata === iata
        )
        if (est) {
          regId  = reg.id
          regNom = reg.nombre
          regCod = reg.codigo
          iata   = est.codigo_iata
          ciudad = est.ciudad
          break
        }
      }

      if (!mapa[regId]) {
        mapa[regId] = {
          regionalId: regId, regionalNombre: regNom,
          regionalCodigo: regCod, estaciones: {}
        }
      }
      const estKey = row.estacion_nombre
      if (!mapa[regId].estaciones[estKey]) {
        mapa[regId].estaciones[estKey] = {
          estacionNombre: row.estacion_nombre, iata, ciudad, vehiculos: []
        }
      }
      mapa[regId].estaciones[estKey].vehiculos.push(row)
    }

    return Object.values(mapa).sort((a, b) =>
      a.regionalNombre.localeCompare(b.regionalNombre)
    )
  }, [avc, regionales])

  // ─── Totales generales ────────────────────────────────────────────────────
  const resumen = useMemo(() => avc?.reduce((acc, r) => ({
    inspecciones: acc.inspecciones + Number(r.total_inspecciones),
    aprobadas:    acc.aprobadas    + Number(r.insp_aprobadas),
    rechazadas:   acc.rechazadas   + Number(r.insp_rechazadas),
    fallas:       acc.fallas       + Number(r.total_fallas),
    fCriticas:    acc.fCriticas    + Number(r.fallas_criticas),
    ots:          acc.ots          + Number(r.ots_generadas),
  }), { inspecciones: 0, aprobadas: 0, rechazadas: 0, fallas: 0, fCriticas: 0, ots: 0 })
  , [avc])

  const dispProm = avc?.length
    ? Math.round(avc.reduce((a, r) => a + Number(r.tasa_disponibilidad), 0) / avc.length) : 0

  const maxFalla = Number(fallas?.[0]?.total_fallas ?? 1)

  function toggleRegional(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handlePDF() {
    if (!avc?.length || !usuario) return
    generarPDFAVC(avc, { desde, hasta, generadoPor: usuario.nombre_completo })
  }

  // ─── Totales por grupo ────────────────────────────────────────────────────
  function sumarGrupo(vehiculos: typeof avc) {
    return (vehiculos ?? []).reduce((acc, r) => ({
      insp:  acc.insp  + Number(r.total_inspecciones),
      apr:   acc.apr   + Number(r.insp_aprobadas),
      rech:  acc.rech  + Number(r.insp_rechazadas),
      fall:  acc.fall  + Number(r.total_fallas),
      fcrit: acc.fcrit + Number(r.fallas_criticas),
      ots:   acc.ots   + Number(r.ots_generadas),
    }), { insp: 0, apr: 0, rech: 0, fall: 0, fcrit: 0, ots: 0 })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none"/>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Capítulo X · GSAN-4.1-05-01 · Vigilancia Continua
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            DASHBOARD ANALÍTICO AVC
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Análisis y Vigilancia Continua de la Flota SEI
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => avc && exportCSV(avc, 'reporte_avc')}
            disabled={!avc?.length}
            className="px-4 py-2.5 text-xs font-bold border border-white/10 text-slate-300
                       rounded-xl hover:bg-white/5 disabled:opacity-40 transition-all
                       uppercase tracking-widest">
            Exportar CSV
          </button>
          <button onClick={handlePDF} disabled={!avc?.length}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold
                       bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                       disabled:opacity-40 transition-all shadow-lg shadow-blue-600/20
                       uppercase tracking-widest">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M2.5 1A1.5 1.5 0 001 2.5v11A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0013.5 1h-11zM8 4a.75.75 0 01.75.75v3.5h1.5a.25.25 0 01.177.427l-2.25 2.25a.25.25 0 01-.354 0l-2.25-2.25A.25.25 0 015.75 8.25h1.5v-3.5A.75.75 0 018 4z"/>
            </svg>
            Generar Dossier PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel rounded-2xl border border-white/5 p-4
                      flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[9px] font-semibold text-slate-500
                           uppercase tracking-widest mb-1.5">Ventana Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                       text-sm text-slate-200 focus:outline-none focus:ring-1
                       focus:ring-blue-500/30 font-mono"/>
        </div>
        <div>
          <label className="block text-[9px] font-semibold text-slate-500
                           uppercase tracking-widest mb-1.5">Ventana Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                       text-sm text-slate-200 focus:outline-none focus:ring-1
                       focus:ring-blue-500/30 font-mono"/>
        </div>
        {esNacional && (
          <div>
            <label className="block text-[9px] font-semibold text-slate-500
                             uppercase tracking-widest mb-1.5">Regional</label>
            <select value={regionalFiltro ?? ''}
              onChange={e => setRegionalFiltro(e.target.value || undefined)}
              className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:ring-1
                         focus:ring-blue-500/30">
              <option value="">Todas las regionales</option>
              {regionales?.map((r: any) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div className="ml-auto text-right">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest">Período de Análisis</p>
          <p className="text-sm font-bold text-blue-400 font-mono">30 Días de Operación Activa</p>
        </div>
      </div>

      {/* KPIs resumen */}
      {resumen && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {[
            { l: 'Inspecciones',    v: resumen.inspecciones, c: 'text-white' },
            { l: 'Aprobadas',       v: resumen.aprobadas,    c: 'text-emerald-400' },
            { l: 'Rechazadas',      v: resumen.rechazadas,   c: resumen.rechazadas > 0 ? 'text-red-400' : 'text-slate-600' },
            { l: 'Fallas Report.',  v: resumen.fallas,       c: resumen.fallas > 0 ? 'text-amber-400' : 'text-slate-600' },
            { l: 'F. Críticas',     v: resumen.fCriticas,    c: resumen.fCriticas > 0 ? 'text-red-500' : 'text-slate-600' },
            { l: 'Ticket OTs',      v: resumen.ots,          c: 'text-blue-400' },
            { l: 'Disponibilidad',  v: `${dispProm}%`,       c: dispProm >= 80 ? 'text-emerald-400' : 'text-red-400' },
          ].map(m => (
            <div key={m.l} className="glass-panel rounded-xl border border-white/5 p-3 text-center">
              <p className={`text-2xl font-bold font-mono ${m.c}`}>{m.v}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{m.l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ─── Tabla AVC agrupada por Regional → Estación ─────────────── */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-slate-500 mb-0.5">
                Status de Flota por Unidad
              </p>
              <p className="text-sm font-semibold text-white">
                {avcAgrupado.length} regionales · {avc?.length ?? 0} unidades en radar
              </p>
            </div>

            {/* Headers tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-white/5">
                  <tr>
                    {[
                      { l: 'IATA',      w: 'w-16' },
                      { l: 'MATRÍCULA', w: 'w-24' },
                      { l: 'MODELO',    w: '' },
                      { l: 'INSP.',     w: 'w-12 text-center' },
                      { l: '✓',         w: 'w-10 text-center' },
                      { l: '✗',         w: 'w-10 text-center' },
                      { l: 'FALLAS',    w: 'w-12 text-center' },
                      { l: '!',         w: 'w-10 text-center' },
                      { l: 'OTS',       w: 'w-10 text-center' },
                      { l: 'DISP.',     w: 'w-16 text-center' },
                    ].map(h => (
                      <th key={h.l}
                        className={`text-left px-3 py-3 text-[9px] font-bold text-slate-600
                                   uppercase tracking-widest ${h.w}`}>
                        {h.l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingAVC ? (
                    <tr><td colSpan={10} className="py-12 text-center">
                      <Spinner />
                    </td></tr>
                  ) : !avcAgrupado.length ? (
                    <tr><td colSpan={10}
                      className="py-12 text-center text-slate-500 text-sm uppercase tracking-widest">
                      Sin datos para el período seleccionado
                    </td></tr>
                  ) : avcAgrupado.map(reg => {
                    const expandida = expandidos.has(reg.regionalId)
                    const estaciones = Object.values(reg.estaciones)
                    const totReg = sumarGrupo(estaciones.flatMap(e => e.vehiculos))
                    const dispReg = estaciones.flatMap(e => e.vehiculos).length > 0
                      ? Math.round(estaciones.flatMap(e => e.vehiculos)
                          .reduce((a, r) => a + Number(r.tasa_disponibilidad), 0)
                          / estaciones.flatMap(e => e.vehiculos).length)
                      : 0

                    return [
                      // ── Fila cabecera REGIONAL ──
                      <tr key={`reg-${reg.regionalId}`}
                        onClick={() => toggleRegional(reg.regionalId)}
                        className="cursor-pointer hover:bg-blue-500/5 transition-all
                                   border-t border-white/5 group">
                        <td colSpan={10} className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {/* Flecha */}
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
                              className={`text-slate-600 transition-transform shrink-0
                                         ${expandida ? 'rotate-90' : ''}`}>
                              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
                            </svg>

                            {/* Badge regional */}
                            <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400
                                           border border-blue-500/30 px-2 py-0.5 rounded font-mono
                                           tracking-widest">
                              {reg.regionalCodigo}
                            </span>

                            {/* Nombre */}
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide
                                           group-hover:text-white transition-colors">
                              {reg.regionalNombre}
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {estaciones.length} est. · {estaciones.flatMap(e => e.vehiculos).length} MRE
                            </span>

                            {/* Totales regional */}
                            <div className="ml-auto flex items-center gap-4">
                              <span className="text-[10px] font-mono text-slate-400">
                                {totReg.insp} insp · {totReg.apr} apr
                              </span>
                              {totReg.fcrit > 0 && (
                                <span className="text-[9px] font-bold bg-red-500/10 text-red-400
                                               border border-red-500/20 px-2 py-0.5 rounded">
                                  {totReg.fcrit} CRÍTICAS
                                </span>
                              )}
                              <span className={`text-xs font-bold font-mono
                                             ${dispReg >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {dispReg}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>,

                      // ── Filas detalle (expandido) ──
                      ...(expandida ? estaciones.map(est => {
                        const totEst = sumarGrupo(est.vehiculos)
                        const dispEst = est.vehiculos.length > 0
                          ? Math.round(est.vehiculos.reduce((a, r) =>
                              a + Number(r.tasa_disponibilidad), 0) / est.vehiculos.length)
                          : 0

                        return [
                          // Fila sub-cabecera ESTACIÓN
                          <tr key={`est-${est.iata}`}
                            className="border-t border-white/5 bg-white/2">
                            <td colSpan={10} className="px-3 py-2">
                              <div className="flex items-center gap-2 pl-5">
                                <span className="font-mono font-bold text-sm text-blue-300">
                                  {est.iata}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                                  {est.estacionNombre} · {est.ciudad}
                                </span>
                                <span className="ml-auto text-[10px] font-mono text-slate-500">
                                  {totEst.insp} insp
                                  {totEst.rech > 0 && (
                                    <span className="text-red-400 ml-2">· {totEst.rech} rech.</span>
                                  )}
                                </span>
                              </div>
                            </td>
                          </tr>,

                          // Filas VEHÍCULOS
                          ...est.vehiculos.map((row, i) => {
                            const disp = Number(row.tasa_disponibilidad)
                            return (
                              <tr key={`${est.iata}-${i}`}
                                className="border-t border-white/5 hover:bg-white/2 transition-colors">
                                <td className="px-3 py-2.5 pl-8">
                                  <span className="text-[10px] text-slate-600 font-mono">{est.iata}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono font-bold text-white text-xs">
                                    {row.vehiculo_matricula}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 italic">
                                  {row.vehiculo_modelo}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.total_inspecciones)}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.insp_aprobadas)}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.insp_rechazadas)} danger={Number(row.insp_rechazadas) > 0}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.total_fallas)} warn={Number(row.total_fallas) > 0}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.fallas_criticas)} danger={Number(row.fallas_criticas) > 0}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <NumCell v={Number(row.ots_generadas)}/>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`font-mono font-bold text-xs
                                                   ${disp >= 80 ? 'text-emerald-400'
                                                   : disp >= 50 ? 'text-amber-400'
                                                   : 'text-red-400'}`}>
                                    {disp}%
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        ]
                      }).flat() : [])
                    ]
                  }).flat()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── Panel derecho ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Fallas por sistema */}
          <div className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Top Heatmap: Fallas
            </p>
            <p className="text-xs font-semibold text-white mb-4">
              Distribución por Subsistemas
            </p>
            {loadingF ? (
              <div className="flex justify-center py-6"><Spinner size="sm"/></div>
            ) : !fallas?.length ? (
              <p className="text-xs text-slate-500 text-center py-4 uppercase tracking-widest">
                Sin incidencias registradas
              </p>
            ) : (
              <div className="space-y-3">
                {fallas.map(f => {
                  const pct = Math.round((Number(f.total_fallas) / maxFalla) * 100)
                  const isCrit = Number(f.fallas_criticas) > 0
                  return (
                    <div key={f.sistema}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400 truncate">{f.sistema}</span>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <span className="font-mono text-amber-400">{f.total_fallas}</span>
                          {isCrit && (
                            <span className="font-bold text-red-400">
                              ({f.fallas_criticas}!)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all
                                       ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`}
                             style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Soporte normativo */}
          <div className="glass-panel rounded-2xl border border-white/5 p-4">
            <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest mb-2">
              Soporte Normativo AVC
            </p>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "El sistema de análisis y vigilancia continua debe permitir a la UAEAC
              identificar tendencias, mitigar riesgos y asegurar la aeronavegabilidad
              de la flota SEI en tiempo real."
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                'Cap. X — GSAN-4.1-05-01',
                'Anexo 14 — OACI',
                'RAC 14 Tabla 9.2',
                'Doc OACI 9137',
              ].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500/50 shrink-0"/>
                  <span className="text-[10px] text-slate-600 font-mono">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
