// ─── Certificaciones TME — Organización de Mantenimiento Aprobada ─────────────
// ODMA registra sus técnicos certificados
// DSNA y Jefe Nacional auditan el estado de vigencia

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { Rol } from '@/core/enums'
import { formatDate } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CertTME {
  id:               string
  nombre_tecnico:   string
  categoria:        'TME_I' | 'TME_III'
  numero_cert:      string
  fecha_emision:    string
  fecha_vencimiento:string
  registrado_por:   string
  activo:           boolean
}

// ─── Semáforo de vigencia ─────────────────────────────────────────────────────

function getEstadoVigencia(fechaVenc: string) {
  const hoy   = new Date()
  const venc  = new Date(fechaVenc)
  const dias  = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (dias < 0)   return { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-400',    label: 'VENCIDO',         dias }
  if (dias <= 30) return { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-400',  label: 'PRÓXIMO A VENCER', dias }
  return              { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'VIGENTE',          dias }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCertificaciones(soloMias: boolean, usuarioId: string) {
  return useQuery({
    queryKey: ['certificaciones', soloMias, usuarioId],
    queryFn: async () => {
      let q = supabase
        .from('certificaciones_tme')
        .select(`*, registrado_usuario:usuarios!certificaciones_tme_registrado_por_fkey(nombre_completo)`)
        .eq('activo', true)
        .order('fecha_vencimiento', { ascending: true })

      if (soloMias) q = q.eq('registrado_por', usuarioId)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as (CertTME & { registrado_usuario: { nombre_completo: string } })[]
    },
    staleTime: 1000 * 60,
  })
}

// ─── Formulario ───────────────────────────────────────────────────────────────

const INPUT = `w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
  text-sm text-slate-200 placeholder-slate-600
  focus:outline-none focus:ring-1 focus:ring-blue-500/30`

const LABEL = `block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5`

interface FormData {
  nombre_tecnico:    string
  categoria:         'TME_I' | 'TME_III'
  numero_cert:       string
  fecha_emision:     string
  fecha_vencimiento: string
}

function FormularioCert({
  inicial, onGuardar, onCancelar
}: {
  inicial?: Partial<FormData>
  onGuardar: (data: FormData) => Promise<void>
  onCancelar: () => void
}) {
  const [form, setForm] = useState<FormData>({
    nombre_tecnico:    inicial?.nombre_tecnico    ?? '',
    categoria:         inicial?.categoria         ?? 'TME_I',
    numero_cert:       inicial?.numero_cert       ?? '',
    fecha_emision:     inicial?.fecha_emision     ?? '',
    fecha_vencimiento: inicial?.fecha_vencimiento ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  function set(k: keyof FormData, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_tecnico || !form.numero_cert || !form.fecha_emision || !form.fecha_vencimiento) {
      setError('Todos los campos son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onGuardar(form)
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>Nombre del técnico *</label>
          <input type="text" value={form.nombre_tecnico}
            onChange={e => set('nombre_tecnico', e.target.value)}
            placeholder="Nombre completo del técnico certificado"
            className={INPUT}/>
        </div>

        <div>
          <label className={LABEL}>Categoría TME *</label>
          <select value={form.categoria}
            onChange={e => set('categoria', e.target.value as any)}
            className={INPUT}>
            <option value="TME_I">TME I — Técnico ejecutor</option>
            <option value="TME_III">TME III — Jefe de Mantenimiento</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Número de certificado *</label>
          <input type="text" value={form.numero_cert}
            onChange={e => set('numero_cert', e.target.value)}
            placeholder="TME-2024-000001"
            className={`${INPUT} font-mono`}/>
        </div>

        <div>
          <label className={LABEL}>Fecha de emisión *</label>
          <input type="date" value={form.fecha_emision}
            onChange={e => set('fecha_emision', e.target.value)}
            className={INPUT}/>
        </div>

        <div>
          <label className={LABEL}>Fecha de vencimiento *</label>
          <input type="date" value={form.fecha_vencimiento}
            onChange={e => set('fecha_vencimiento', e.target.value)}
            className={INPUT}/>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5
                        text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs
                     text-slate-400 hover:bg-white/5 transition-all uppercase tracking-widest font-bold">
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                     text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40">
          {guardando ? 'Guardando...' : 'Guardar Certificación'}
        </button>
      </div>
    </form>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CertificacionesList() {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)
  const rol     = usuario?.rol as Rol

  const esODMA     = rol === Rol.ODMA
  const puedeVer   = esODMA || rol === Rol.DSNA || rol === Rol.JefeNacional || rol === Rol.JefeRegional

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando,    setEditando]    = useState<CertTME | null>(null)
  const [filtro,      setFiltro]      = useState<'todos' | 'vigentes' | 'vencidos' | 'proximos'>('todos')

  const { data: certs, isLoading } = useCertificaciones(esODMA, usuario?.id ?? '')

  // Filtrar según selector
  const certsFiltradas = (certs ?? []).filter(c => {
    const est = getEstadoVigencia(c.fecha_vencimiento)
    if (filtro === 'vigentes')  return est.dias > 30
    if (filtro === 'proximos')  return est.dias >= 0 && est.dias <= 30
    if (filtro === 'vencidos')  return est.dias < 0
    return true
  })

  // KPIs
  const total    = certs?.length ?? 0
  const vigentes = certs?.filter(c => getEstadoVigencia(c.fecha_vencimiento).dias > 30).length ?? 0
  const proximos = certs?.filter(c => { const e = getEstadoVigencia(c.fecha_vencimiento); return e.dias >= 0 && e.dias <= 30 }).length ?? 0
  const vencidos = certs?.filter(c => getEstadoVigencia(c.fecha_vencimiento).dias < 0).length ?? 0

  async function handleGuardar(data: FormData) {
    await supabase.from('certificaciones_tme').insert({
      ...data,
      registrado_por: usuario!.id,
    })
    qc.invalidateQueries({ queryKey: ['certificaciones'] })
    setMostrarForm(false)
  }

  async function handleEditar(id: string, data: FormData) {
    await supabase.from('certificaciones_tme').update(data).eq('id', id)
    qc.invalidateQueries({ queryKey: ['certificaciones'] })
    setEditando(null)
  }

  async function handleEliminar(id: string) {
    await supabase.from('certificaciones_tme').update({ activo: false }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['certificaciones'] })
  }

  if (!puedeVer) return (
    <p className="text-slate-500 text-sm text-center py-16">Sin acceso a este módulo</p>
  )

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none"/>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Cap. VII · GSAN-4.1.05-01 · UAEAC
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CERTIFICACIONES TME
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {esODMA
              ? 'Personal técnico certificado de su organización'
              : 'Auditoría de habilitaciones del personal ODMA'}
          </p>
        </div>
        {esODMA && !mostrarForm && (
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500
                       text-white text-xs font-bold rounded-xl uppercase tracking-widest
                       transition-all shadow-lg shadow-blue-600/20">
            + Registrar Técnico
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Total técnicos',      v: total,    c: 'text-white',         f: 'todos' },
          { l: 'Certificados vigentes', v: vigentes, c: 'text-emerald-400', f: 'vigentes' },
          { l: 'Próximos a vencer',   v: proximos, c: proximos > 0 ? 'text-amber-400' : 'text-slate-600', f: 'proximos' },
          { l: 'Vencidos',            v: vencidos, c: vencidos > 0 ? 'text-red-400' : 'text-slate-600',   f: 'vencidos' },
        ].map(m => (
          <button key={m.l}
            onClick={() => setFiltro(m.f as any)}
            className={`glass-panel rounded-xl border p-4 text-center transition-all
                       hover:border-white/10 ${filtro === m.f ? 'border-blue-500/30' : 'border-white/5'}`}>
            <p className={`text-3xl font-bold font-mono ${m.c}`}>{m.v}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{m.l}</p>
          </button>
        ))}
      </div>

      {/* Formulario nuevo */}
      {mostrarForm && (
        <div className="glass-panel rounded-2xl border border-blue-500/20 p-5">
          <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest mb-4">
            Registrar nuevo técnico certificado
          </p>
          <FormularioCert
            onGuardar={handleGuardar}
            onCancelar={() => setMostrarForm(false)}/>
        </div>
      )}

      {/* Lista */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
              Personal técnico ODMA
            </p>
            <p className="text-sm font-bold text-white">
              {certsFiltradas.length} registro{certsFiltradas.length !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Filtro rápido */}
          <div className="flex gap-1">
            {[
              { k: 'todos',    l: 'Todos' },
              { k: 'vigentes', l: 'Vigentes' },
              { k: 'proximos', l: 'Por vencer' },
              { k: 'vencidos', l: 'Vencidos' },
            ].map(f => (
              <button key={f.k}
                onClick={() => setFiltro(f.k as any)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide
                           transition-all ${filtro === f.k
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !certsFiltradas.length ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm uppercase tracking-widest">
              {filtro === 'todos'
                ? esODMA
                  ? 'No has registrado técnicos aún'
                  : 'Sin certificaciones registradas por la ODMA'
                : `Sin técnicos en estado "${filtro}"`}
            </p>
            {esODMA && filtro === 'todos' && (
              <button onClick={() => setMostrarForm(true)}
                className="mt-3 text-blue-400 text-xs hover:text-blue-300 uppercase tracking-widest">
                + Registrar primer técnico
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-white/5">
                <tr>
                  {['Técnico', 'Categoría', 'N° Certificado', 'Emisión', 'Vencimiento', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] font-bold
                                          text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {certsFiltradas.map(c => {
                  const est = getEstadoVigencia(c.fecha_vencimiento)
                  const editandoEste = editando?.id === c.id

                  return editandoEste ? (
                    <tr key={c.id}>
                      <td colSpan={7} className="px-4 py-4">
                        <FormularioCert
                          inicial={c}
                          onGuardar={(data) => handleEditar(c.id, data)}
                          onCancelar={() => setEditando(null)}/>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-200">{c.nombre_tecnico}</p>
                        {!esODMA && (
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            ODMA
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase
                                         tracking-wide ${c.categoria === 'TME_III'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {c.categoria.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300 text-[10px]">
                        {c.numero_cert}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatDate(c.fecha_emision)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-mono font-semibold ${est.color}`}>
                          {formatDate(c.fecha_vencimiento)}
                        </span>
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          {est.dias < 0
                            ? `Venció hace ${Math.abs(est.dias)} días`
                            : `Vence en ${est.dias} días`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border
                                         w-fit ${est.bg} ${est.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${est.dot} ${
                            est.dias > 30 ? 'animate-pulse' : ''
                          }`}/>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${est.color}`}>
                            {est.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {esODMA && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditando(c)}
                              className="text-[9px] text-slate-500 hover:text-blue-400
                                         uppercase tracking-widest transition-colors">
                              Editar
                            </button>
                            <span className="text-slate-700">·</span>
                            <button onClick={() => handleEliminar(c.id)}
                              className="text-[9px] text-slate-500 hover:text-red-400
                                         uppercase tracking-widest transition-colors">
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
