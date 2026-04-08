import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { invalidarCacheChecklist } from '@/services/checklists.service'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string; fase: string; programa_mto: string | null; sistema: string
  descripcion: string; critico: boolean; orden: number; activo: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FASE_LABELS: Record<string, string> = {
  cambio_turno: 'RELEVO',
  f0: 'F0 DIARIA',
  f1: 'F1 PERIÓDICA',
  f2: 'F2 MAYOR',
  f3: 'F3 OVERHAUL',
}

const PROGRAMA_LABELS: Record<string, string> = {
  PM_SERIE_T:  'OSHKOSH T-SERIES',
  PM_S1500:    'OSHKOSH STRIKER',
  PM_P4X4:     'ROB PANTHER 4X4',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useChecklistItems(fase: string, programa: string) {
  return useQuery({
    queryKey: ['admin', 'checklist', fase, programa],
    queryFn: async () => {
      let q = supabase
        .from('checklist_items')
        .select('*')
        .eq('fase', fase)
        .order('sistema')
        .order('orden')

      if (programa === 'todos') {
        q = q.is('programa_mto', null)
      } else {
        q = q.or(`programa_mto.is.null,programa_mto.eq.${programa}`)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ChecklistItem[]
    },
  })
}

// ─── Formulario nuevo/editar ítem ────────────────────────────────────────────

interface FormItem {
  fase: string; programa_mto: string; sistema: string; descripcion: string
  critico: boolean; orden: string
}

const FORM_VACIO: FormItem = {
  fase: 'f1', programa_mto: '', sistema: '', descripcion: '', critico: false, orden: '0',
}

function ModalItem({ item, onGuardar, onCerrar }: {
  item?: ChecklistItem; onGuardar: (data: Partial<ChecklistItem>) => void; onCerrar: () => void
}) {
  const [form, setForm] = useState<FormItem>(
    item ? {
      fase:         item.fase,
      programa_mto: item.programa_mto ?? '',
      sistema:      item.sistema,
      descripcion:  item.descripcion,
      critico:      item.critico,
      orden:        String(item.orden),
    } : FORM_VACIO
  )

  function set(k: keyof FormItem, v: string | boolean) { setForm(p => ({ ...p, [k]: v })) }

  const sistemas = [
    'Motor principal', 'Sistema de extinción', 'Frenos', 'Dirección',
    'Sistema eléctrico', 'Transmisión e hidráulica', 'Neumáticos y aros',
    'Chasis y carrocería', 'Cabina y controles', 'Herramientas y equipos',
    'TAK-4 Suspension', 'Fire Suppression', 'Rosenbauer PCS', 'Otro',
  ]

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
      <div className="glass-panel border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/50" />
        
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Protocol Modification</p>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
              {item ? 'Actualizar Parámetro' : 'Nuevo Ítem de Control'}
            </h3>
          </div>
          <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-slate-900 border border-white/5 rounded-xl">Cerrar [X]</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onGuardar({ fase: form.fase as any, programa_mto: form.programa_mto || null, sistema: form.sistema.trim(), descripcion: form.descripcion.trim(), critico: form.critico, orden: Number(form.orden) || 0 } as any) }} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Fase Operativa</label>
              <select value={form.fase} onChange={e => set('fase', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                {Object.entries(FASE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Plataforma (Programa)</label>
              <select value={form.programa_mto} onChange={e => set('programa_mto', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                <option value="" className="bg-slate-900 text-slate-500">COMÚN (TODOS)</option>
                {Object.entries(PROGRAMA_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Subsistema / Categoría</label>
            <input list="sistemas-list" value={form.sistema} onChange={e => set('sistema', e.target.value)} placeholder="ESCRIBA O SELECCIONE..." required
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase"/>
            <datalist id="sistemas-list">{sistemas.map(s => <option key={s} value={s}/>)}</datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Criterio Técnico de Inspección</label>
            <textarea rows={3} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="DESCRIBA EL PUNTO DE CONTROL..." required
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none uppercase font-mono leading-relaxed"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Secuencia (Orden)</label>
              <input type="number" min="0" value={form.orden} onChange={e => set('orden', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-all", form.critico ? "bg-red-600 border-red-500 shadow-lg shadow-red-600/20" : "bg-slate-900 border-white/5")}>
                   {form.critico && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
                <input type="checkbox" checked={form.critico} onChange={e => set('critico', e.target.checked)} className="hidden"/>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-red-400 transition-colors">Safety Critical Item</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCerrar} className="flex-1 py-4 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest">Desestimar</button>
            <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold font-mono tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 border border-white/10 transition-all">
              {item ? 'ACTUALIZAR NODO' : 'INTEGRAR ÍTEM →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminChecklists() {
  const usuario  = useAuthStore(s => s.usuario)
  const qc       = useQueryClient()

  const [fase,     setFase]     = useState('f1')
  const [programa, setPrograma] = useState('todos')
  const [modal,    setModal]    = useState<'nuevo' | ChecklistItem | null>(null)

  const { data: items, isLoading } = useChecklistItems(fase, programa)

  const porSistema: Record<string, ChecklistItem[]> = {}
  for (const item of items ?? []) {
    if (!porSistema[item.sistema]) porSistema[item.sistema] = []
    porSistema[item.sistema].push(item)
  }

  const { mutate: guardar } = useMutation({
    mutationFn: async (data: { id?: string } & Partial<ChecklistItem>) => {
      if (data.id) {
        const { error } = await supabase.from('checklist_items').update(data).eq('id', data.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('checklist_items').insert({ ...data, creado_por: usuario?.id })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'checklist'] }); invalidarCacheChecklist(); setModal(null) },
  })

  const { mutate: toggleActivo } = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('checklist_items').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'checklist'] }); invalidarCacheChecklist() },
  })

  return (
    <div className="space-y-8 page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1 h-3 bg-indigo-600 rounded-full" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Standard Ops Procedures (SOP)</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Protocolos de Inspección</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1 italic">
             {items?.length ?? 0} PARÁMETROS DE SEGURIDAD CONFIGURADOS // CAP. XI MANUAL GSAN
          </p>
        </div>
        <button onClick={() => setModal('nuevo')} className="px-6 py-3 bg-blue-600 text-white text-[11px] font-bold rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10">
          Nuevo Punto de Control +
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-slate-900 border border-white/5 rounded-2xl p-1.5 w-full md:w-auto">
          {Object.entries(FASE_LABELS).map(([v, l]) => (
            <button key={v} onClick={() => setFase(v)}
              className={cn("flex-1 md:flex-none px-5 py-2.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest", fase === v ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]" : "text-slate-500 hover:text-slate-300")}>
              {l.split(' ')[0]}
            </button>
          ))}
        </div>

        <select value={programa} onChange={e => setPrograma(e.target.value)}
          className="flex-1 w-full md:w-auto bg-slate-900 border border-white/5 rounded-2xl px-5 py-3.5 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-mono appearance-none">
          <option value="todos">PLATAFORMAS COMUNES / TODOS</option>
          {Object.entries(PROGRAMA_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
        </select>
      </div>

      {isLoading ? <div className="flex flex-col items-center justify-center py-24 gap-4"><Spinner size="lg" /><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizando Terminal...</p></div> : 
        Object.keys(porSistema).length === 0 ? (
          <div className="glass-panel border-white/5 rounded-3xl p-20 text-center"><p className="text-[10px] font-bold text-slate-700 uppercase tracking-[.3em]">Protocolo vacío para este parámetro</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(porSistema).map(([sistema, sItems]) => (
              <div key={sistema} className="glass-panel border-white/5 rounded-3xl overflow-hidden shadow-xl group">
                <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-[.2em]">{sistema}</h3>
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-widest">{sItems.length} NODOS</span>
                </div>
                <div className="divide-y divide-white/5">
                  {sItems.map(item => (
                    <div key={item.id} className={cn("flex items-start gap-6 px-8 py-5 hover:bg-white/5 transition-all", !item.activo && "opacity-30 grayscale")}>
                      <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 shadow-lg", item.critico ? "bg-red-500 shadow-red-500/40 animate-pulse" : "bg-slate-700")}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-100 uppercase tracking-tight font-mono leading-relaxed">{item.descripcion}</p>
                        <div className="flex items-center gap-4 mt-2">
                           <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-widest">SEQ #{item.orden}</span>
                           {item.programa_mto && <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/10 font-bold uppercase tracking-widest">{PROGRAMA_LABELS[item.programa_mto]}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setModal(item)} className="p-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500/20 transition-all">
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"/></svg>
                        </button>
                        <button onClick={() => toggleActivo({ id: item.id, activo: !item.activo })} className={cn("p-2.5 bg-slate-950/50 border border-white/5 rounded-xl transition-all", item.activo ? "text-red-500 hover:bg-red-500 hover:text-white" : "text-emerald-500 hover:bg-emerald-500 hover:text-white")}>
                          {item.activo ? <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg> : <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {modal && (
        <ModalItem
          item={modal === 'nuevo' ? undefined : modal}
          onGuardar={(data) => guardar(modal === 'nuevo' ? data : { ...data, id: (modal as ChecklistItem).id })}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  )
}
