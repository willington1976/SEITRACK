// ─── Novedades Activas — Vista jerárquica Regional → Estación → Vehículo ─────
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { Rol } from '@/core/enums'

function useNovedadesActivas() {
  return useQuery({
    queryKey: ['novedades-activas-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discrepancias')
        .select(`
          id, descripcion, sistema_afectado, criticidad, estado, created_at,
          vehiculo:vehiculos!inner(
            id, matricula, modelo,
            estacion:estaciones!inner(
              id, nombre, codigo_iata, ciudad,
              regional:regionales!inner(id, nombre, codigo)
            )
          )
        `)
        .in('estado', ['abierta', 'en_proceso'])
        .order('criticidad', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

function diasDesde(fecha: string) {
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  return 'Hace ' + d + ' días'
}

const CRIT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  alta:  { dot: 'bg-red-400',   text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   label: 'CRÍTICA' },
  media: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'MEDIA'   },
  baja:  { dot: 'bg-blue-400',  text: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  label: 'LEVE'    },
}

function NovedadCard({ d }: { d: any }) {
  const cr = CRIT[d.criticidad] ?? CRIT.baja
  return (
    <div className={'flex items-start gap-3 rounded-xl border px-4 py-3 hover:bg-white/2 transition-all ' + cr.border}>
      <div className={'w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ' + cr.dot + (d.criticidad === 'alta' ? ' animate-pulse' : '')}/>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-200 leading-snug">{d.descripcion}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide">{d.sistema_afectado}</span>
          <span className="text-slate-700">·</span>
          <span className="text-[9px] text-slate-600">{diasDesde(d.created_at)}</span>
        </div>
      </div>
      <span className={'text-[9px] font-bold px-2 py-1 rounded-lg border shrink-0 uppercase tracking-wide ' + cr.bg + ' ' + cr.text + ' ' + cr.border}>
        {cr.label}
      </span>
    </div>
  )
}

function VehiculoCard({ matricula, modelo, novedades }: { matricula: string; modelo: string; novedades: any[] }) {
  const [open, setOpen] = useState(false)
  const criticas = novedades.filter(n => n.criticidad === 'alta').length
  const medias   = novedades.filter(n => n.criticidad === 'media').length
  const leves    = novedades.filter(n => n.criticidad === 'baja').length
  return (
    <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-all text-left group">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" className="text-slate-400">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v8a1 1 0 001 1h.5a2.5 2.5 0 015 0h3a2.5 2.5 0 015 0H17a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0013.586 5H3z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-white group-hover:text-blue-300 transition-colors">{matricula}</span>
            <span className="text-[10px] text-slate-500 italic">{modelo}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {criticas > 0 && <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">{criticas} crítica{criticas > 1 ? 's' : ''}</span>}
            {medias   > 0 && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">{medias} media{medias > 1 ? 's' : ''}</span>}
            {leves    > 0 && <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">{leves} leve{leves > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
          className={'text-slate-600 transition-transform shrink-0 ' + (open ? 'rotate-90' : '')}>
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-3 space-y-2 border-t border-white/5">
          {novedades.map((d: any) => <NovedadCard key={d.id} d={d}/>)}
        </div>
      )}
    </div>
  )
}

function EstacionCard({ iata, nombre, ciudad, novedades }: { iata: string; nombre: string; ciudad: string; novedades: any[] }) {
  const [open, setOpen] = useState(false)
  const porVehiculo = novedades.reduce((acc: any, n: any) => {
    const k = n.vehiculo.id
    if (!acc[k]) acc[k] = { matricula: n.vehiculo.matricula, modelo: n.vehiculo.modelo, novedades: [] }
    acc[k].novedades.push(n)
    return acc
  }, {})
  const criticas = novedades.filter((n: any) => n.criticidad === 'alta').length
  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-all text-left group">
        <span className="font-mono font-bold text-base text-blue-300 shrink-0 w-10">{iata}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{nombre}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{ciudad}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {criticas > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"/>
              {criticas} crítica{criticas > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[9px] font-mono text-slate-500">{novedades.length} total</span>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
            className={'text-slate-600 transition-transform ' + (open ? 'rotate-90' : '')}>
            <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-4 space-y-3 border-t border-white/5">
          {Object.values(porVehiculo).map((v: any) => (
            <VehiculoCard key={v.matricula} matricula={v.matricula} modelo={v.modelo} novedades={v.novedades}/>
          ))}
        </div>
      )}
    </div>
  )
}

function RegionalCard({ nombre, codigo, novedades, defaultOpen }: { nombre: string; codigo: string; novedades: any[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const porEstacion = novedades.reduce((acc: any, n: any) => {
    const e = n.vehiculo.estacion
    if (!acc[e.id]) acc[e.id] = { iata: e.codigo_iata, nombre: e.nombre, ciudad: e.ciudad, novedades: [] }
    acc[e.id].novedades.push(n)
    return acc
  }, {})
  const criticas = novedades.filter((n: any) => n.criticidad === 'alta').length
  const medias   = novedades.filter((n: any) => n.criticidad === 'media').length
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(p => !p)}
        className="w-full glass-panel rounded-2xl border border-white/5 hover:border-white/10 transition-all group overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className={'w-1 h-10 rounded-full shrink-0 ' + (criticas > 0 ? 'bg-red-500' : medias > 0 ? 'bg-amber-500' : 'bg-emerald-500')}/>
          <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded font-mono tracking-widest shrink-0">
            {codigo}
          </span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-slate-200 uppercase tracking-wide group-hover:text-white transition-colors">{nombre}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {Object.keys(porEstacion).length} est. · {novedades.length} novedad{novedades.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {criticas > 0 && <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg">{criticas} ●</span>}
            {medias   > 0 && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg">{medias} ◐</span>}
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"
              className={'text-slate-600 transition-transform ' + (open ? 'rotate-90' : '')}>
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9 8.06 6.22 5.28a.75.75 0 010-1.06z"/>
            </svg>
          </div>
        </div>
      </button>
      {open && (
        <div className="pl-4 space-y-2">
          {Object.values(porEstacion).map((e: any) => (
            <EstacionCard key={e.iata} iata={e.iata} nombre={e.nombre} ciudad={e.ciudad} novedades={e.novedades}/>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NovedadesActivas() {
  const usuario    = useAuthStore(s => s.usuario)
  const esRegional = usuario?.rol === Rol.JefeRegional
  const { data: novedades, isLoading } = useNovedadesActivas()
  const [filtro, setFiltro] = useState<'todas' | 'alta' | 'media' | 'baja'>('todas')

  const filtradas = (novedades ?? []).filter(n => filtro === 'todas' || n.criticidad === filtro)

  const porRegional = filtradas.reduce((acc: any, n: any) => {
    const r = n.vehiculo.estacion.regional
    if (!acc[r.id]) acc[r.id] = { nombre: r.nombre, codigo: r.codigo, novedades: [] }
    acc[r.id].novedades.push(n)
    return acc
  }, {})

  const total    = (novedades ?? []).length
  const criticas = (novedades ?? []).filter((n: any) => n.criticidad === 'alta').length
  const medias   = (novedades ?? []).filter((n: any) => n.criticidad === 'media').length
  const leves    = (novedades ?? []).filter((n: any) => n.criticidad === 'baja').length

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/4 blur-[120px] pointer-events-none"/>

      <div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-amber-400/70 mb-1">
          Vigilancia Continua · AVC
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">NOVEDADES ACTIVAS</h1>
        <p className="text-slate-400 text-xs mt-1">Discrepancias abiertas en toda la flota SEI</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Total activas', v: total,    c: 'text-white',                                          f: 'todas' },
          { l: 'Críticas',      v: criticas, c: criticas > 0 ? 'text-red-400'   : 'text-slate-600',   f: 'alta'  },
          { l: 'Medias',        v: medias,   c: medias   > 0 ? 'text-amber-400' : 'text-slate-600',   f: 'media' },
          { l: 'Leves',         v: leves,    c: leves    > 0 ? 'text-blue-400'  : 'text-slate-600',   f: 'baja'  },
        ].map(m => (
          <button key={m.f} onClick={() => setFiltro(m.f as any)}
            className={'glass-panel rounded-xl border p-4 text-center transition-all hover:border-white/10 ' + (filtro === m.f ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5')}>
            <p className={'text-3xl font-bold font-mono ' + m.c}>{m.v}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{m.l}</p>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !Object.keys(porRegional).length ? (
        <div className="glass-panel rounded-2xl border border-emerald-500/20 p-16 text-center">
          <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Sin novedades activas</p>
          <p className="text-slate-500 text-xs mt-2">Toda la flota SEI está nominal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(porRegional)
            .sort((a: any, b: any) =>
              b.novedades.filter((n: any) => n.criticidad === 'alta').length -
              a.novedades.filter((n: any) => n.criticidad === 'alta').length
            )
            .map((r: any) => (
              <RegionalCard key={r.codigo} nombre={r.nombre} codigo={r.codigo}
                novedades={r.novedades}
                defaultOpen={esRegional || Object.keys(porRegional).length === 1}/>
            ))}
        </div>
      )}
    </div>
  )
}
