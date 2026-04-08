import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'
import { generarPDFCertificaciones } from '@/lib/pdf'
import type { CertPersonal } from '@/lib/pdf'
import { Rol } from '@/core/enums'

interface CertRow {
  id: string; nombre_completo: string; email: string
  estacion_nombre: string; codigo_iata: string; regional_nombre: string
  categoria: string; numero_certificado: string; programa_mto: string
  fecha_emision: string; fecha_vencimiento: string; dias_restantes: number
  activo: boolean
}

function useCertificaciones() {
  const usuario    = useAuthStore(s => s.usuario)
  const esNacional = usuario?.rol === Rol.JefeNacional || usuario?.rol === Rol.DSNA
  return useQuery({
    queryKey: ['certificaciones', usuario?.estacion_id],
    queryFn: async () => {
      let q = supabase
        .from('certificaciones_por_vencer')
        .select('*')
      if (!esNacional) {
        q = q.eq('estacion_nombre',
          (usuario?.estacion as { nombre?: string } | undefined)?.nombre ?? '')
      }
      const { data, error } = await q.order('dias_restantes')
      if (error) throw error
      return (data ?? []) as CertRow[]
    },
  })
}

function useCertTodas() {
  return useQuery({
    queryKey: ['certificaciones', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificaciones')
        .select(`
          *,
          usuario:usuarios(nombre_completo, email,
            estacion:estaciones(nombre, codigo_iata,
              regional:regionales(nombre)))
        `)
        .order('fecha_vencimiento')
      if (error) throw error
      return data
    },
  })
}

const diasColorCfg = {
  vencido: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
  critico: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  nominal: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
}

function diasBadge(dias: number) {
  if (dias <= 0)  return { label: 'LICENSE EXPIRED', color: diasColorCfg.vencido, bar: 'bg-red-600' }
  if (dias <= 30) return { label: `${dias}D REMAINING`, color: diasColorCfg.critico, bar: 'bg-amber-600' }
  return { label: `${dias}D NOMINAL`, color: diasColorCfg.nominal, bar: 'bg-emerald-600' }
}

export default function CertificacionesList() {
  const usuario    = useAuthStore(s => s.usuario)
  const esNacional = usuario?.rol === Rol.JefeNacional || usuario?.rol === Rol.DSNA
  const { data: porVencer, isLoading }  = useCertificaciones()
  const { data: todas }                 = useCertTodas()
  const qc = useQueryClient()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    usuario_id: '', categoria: 'A', numero_certificado: '',
    programa_mto: 'PM_SERIE_T', fecha_emision: '', fecha_vencimiento: '',
    observaciones: '',
  })

  const { mutate: crearCert, isPending: creando } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('certificaciones').insert({
        ...form, emitido_por: 'UAEAC', activo: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificaciones'] })
      setMostrarForm(false)
      setForm({ usuario_id: '', categoria: 'A', numero_certificado: '',
        programa_mto: 'PM_SERIE_T', fecha_emision: '', fecha_vencimiento: '', observaciones: '' })
    },
  })

  function handlePDF() {
    if (!todas || !usuario) return
    const porPersona = new Map<string, CertPersonal>()
    for (const c of todas) {
      const u = c.usuario as any
      if (!u) continue
      const key = c.usuario_id
      if (!porPersona.has(key)) {
        porPersona.set(key, {
          nombre_completo: u.nombre_completo,
          email:           u.email,
          rol:             '',
          estacion:        u.estacion?.nombre ?? '',
          regional:        u.estacion?.regional?.nombre ?? '',
          certificaciones: [],
        })
      }
      porPersona.get(key)!.certificaciones.push({
        categoria:        c.categoria,
        numero:           c.numero_certificado,
        programa:         c.programa_mto,
        emision:          c.fecha_emision,
        vencimiento:      c.fecha_vencimiento,
        diasRestantes:    Math.floor((new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000),
      })
    }
    generarPDFCertificaciones([...porPersona.values()], usuario.nombre_completo)
  }

  const vencidas  = porVencer?.filter(c => c.dias_restantes <= 0).length ?? 0
  const criticas  = porVencer?.filter(c => c.dias_restantes > 0 && c.dias_restantes <= 30).length ?? 0

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1 h-3 bg-amber-600 rounded-full" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Personnel Compliance Logs</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Certificaciones TME</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.2em] mt-1 space-x-3">
             <span>REF: MANUAL GSAN-4.1-05-01</span>
             {vencidas > 0 && <span className="text-red-500 font-bold underline decoration-red-500/20 decoration-2 underline-offset-4 tracking-widest">[{vencidas} VENCIDAS]</span>}
          </p>
        </div>
        
        <div className="flex gap-2">
          {esNacional && (
            <button onClick={handlePDF}
              className="px-6 py-3 bg-slate-900 border border-white/5 text-slate-400 text-[11px] font-bold rounded-2xl hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest">
              Exportar PDF
            </button>
          )}
          {esNacional && (
            <button onClick={() => setMostrarForm(v => !v)}
              className="px-6 py-3 bg-blue-600 text-white text-[11px] font-bold rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10">
              New License +
            </button>
          )}
        </div>
      </div>

      {/* Resumen Alertas Cockpit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: 'TOTAL EXPIRED', v: vencidas, c: 'text-red-500', bar: 'bg-red-600', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' },
          { l: 'WARNING 30D',   v: criticas, c: 'text-amber-500', bar: 'bg-amber-600', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
          { l: 'SYSTEM ALERTS', v: porVencer?.length ?? 0, c: 'text-slate-400', bar: 'bg-slate-700', glow: '' },
        ].map(m => (
          <div key={m.l} className={cn("glass-panel rounded-2xl p-6 relative overflow-hidden", m.glow)}>
             <div className={cn("absolute left-0 top-0 bottom-0 w-1", m.bar)} />
             <p className={cn("text-3xl font-mono font-bold leading-none", m.c)}>{isLoading ? '—' : m.v}</p>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Formulario Certificación Aero */}
      {mostrarForm && (
        <div className="glass-panel rounded-2xl p-8 border-blue-500/20 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
             <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Registro de Nueva Licencia</h2>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[.2em]">Compliance Database Entry</p>
             </div>
             <button onClick={() => setMostrarForm(false)} className="text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">Abortar [X]</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {[
              { k: 'numero_certificado', l: 'Número de Licencia Certificada', type: 'text', placeholder: 'TME-XXXX-XXX' },
              { k: 'fecha_emision',      l: 'Fecha de Emisión de UAEAC', type: 'date', placeholder: '' },
              { k: 'fecha_vencimiento',  l: 'Fecha de Vencimiento Legal', type: 'date', placeholder: '' },
              { k: 'observaciones',      l: 'Comentarios de Discrepancia / Validez', type: 'text', placeholder: 'REGISTRE NOVEDADES...' },
            ].map(f => (
              <div key={f.k} className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">{f.l}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(form as any)[f.k]}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase"/>
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Categoría Técnica TME</label>
              <select value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                {['A','B','C','D'].map(c => <option key={c} value={c} className="bg-slate-900">CATEGORÍA {c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Programa Mantenimiento / Flota</label>
              <select value={form.programa_mto}
                onChange={e => setForm(p => ({ ...p, programa_mto: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                <option value="PM_SERIE_T" className="bg-slate-900">OSHKOSH SERIE T</option>
                <option value="PM_S1500" className="bg-slate-900">OSHKOSH STRIKER 1500</option>
                <option value="PM_P4X4" className="bg-slate-900">ROSENBAUER PANTHER 4×4</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4">
             <button onClick={() => crearCert()} disabled={creando}
               className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold hover:bg-blue-500 disabled:opacity-50 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10">
               {creando ? 'SYNCHRONIZING...' : 'AUTORIZAR Y GUARDAR REGISTRO'}
             </button>
          </div>
        </div>
      )}

      {/* Lista de Discrepancias / Certificaciones por vencer Aero */}
      <div className="glass-panel border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-white/5">
          <h2 className="text-sm font-bold text-white uppercase tracking-tight">Registro de Alertas de Vigencia</h2>
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1 italic">Vencimientos Próximos o Activos</p>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
             <Spinner />
             <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Escaneando Personal...</p>
          </div>
        ) : !porVencer?.length ? (
          <div className="py-16 text-center">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[.25em]">Personal con Licencia Nominal</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {porVencer.map(c => {
              const db = diasBadge(c.dias_restantes)
              return (
                <div key={c.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 transition-all hover:bg-white/5 relative overflow-hidden",
                    c.dias_restantes <= 0 ? 'bg-red-500/5' : ''
                  )}>
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", db.bar)} />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-200 uppercase tracking-tight truncate">{c.nombre_completo}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono uppercase">
                       <span className="text-blue-500 font-bold">{c.codigo_iata}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <span>{c.estacion_nombre}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <span className="text-slate-400">CERT: {c.numero_certificado}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    <div className="text-right space-y-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CAT {c.categoria} · {c.programa_mto}</p>
                       <p className="text-[10px] text-slate-600 font-mono">EXPIRY: {formatDate(c.fecha_vencimiento)}</p>
                    </div>
                    <Badge className={cn("px-3 py-1.5 font-bold text-[9px] border uppercase tracking-widest whitespace-nowrap", db.color)}>
                       {db.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
