import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { invalidarCacheChecklist } from '@/services/checklists.service'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { FaseInspeccion, ProgramaMTO } from '@/core/enums'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  fase: string
  programa_mto: string | null
  sistema: string
  descripcion: string
  critico: boolean
  orden: number
  activo: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FASE_LABELS: Record<string, string> = {
  cambio_turno: 'Cambio de turno',
  f0: 'F0 — Diaria',
  f1: 'F1 — Periódica',
  f2: 'F2 — Mayor',
  f3: 'F3 — Overhaul',
}

const PROGRAMA_LABELS: Record<string, string> = {
  PM_SERIE_T:  'Oshkosh Serie T',
  PM_S1500:    'Oshkosh Striker 1500',
  PM_P4X4:     'Rosenbauer Panther 4×4',
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
  fase:         string
  programa_mto: string
  sistema:      string
  descripcion:  string
  critico:      boolean
  orden:        string
}

const FORM_VACIO: FormItem = {
  fase:         'f1',
  programa_mto: '',
  sistema:      '',
  descripcion:  '',
  critico:      false,
  orden:        '0',
}

function ModalItem({
  item,
  onGuardar,
  onCerrar,
}: {
  item?: ChecklistItem
  onGuardar: (data: Partial<ChecklistItem>) => void
  onCerrar:  () => void
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

  function set(k: keyof FormItem, v: string | boolean) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onGuardar({
      fase:         form.fase as FaseInspeccion,
      programa_mto: form.programa_mto || null,
      sistema:      form.sistema.trim(),
      descripcion:  form.descripcion.trim(),
      critico:      form.critico,
      orden:        Number(form.orden) || 0,
    } as any)
  }

  const sistemas = [
    'Motor principal', 'Sistema de extinción', 'Frenos', 'Dirección',
    'Sistema eléctrico', 'Transmisión e hidráulica', 'Neumáticos y aros',
    'Chasis y carrocería', 'Cabina y controles', 'Herramientas y equipos',
    'Sistema Oshkosh TAK-4', 'Sistema Striker', 'Sistema Rosenbauer',
    'Inspección periódica F1', 'Otro',
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">
            {item ? 'Editar ítem' : 'Nuevo ítem de checklist'}
          </p>
          <button onClick={onCerrar} className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-gray-400">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fase *</label>
              <select value={form.fase} onChange={e => set('fase', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400 bg-white">
                {Object.entries(FASE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Programa MTO</label>
              <select value={form.programa_mto} onChange={e => set('programa_mto', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400 bg-white">
                <option value="">Todos los programas</option>
                {Object.entries(PROGRAMA_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sistema *</label>
            <input
              list="sistemas-list"
              value={form.sistema}
              onChange={e => set('sistema', e.target.value)}
              placeholder="Selecciona o escribe un sistema..."
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"
            />
            <datalist id="sistemas-list">
              {sistemas.map(s => <option key={s} value={s}/>)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe el ítem de inspección..."
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <input type="number" min="0" value={form.orden}
                onChange={e => set('orden', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"/>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.critico}
                  onChange={e => set('critico', e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-sm text-gray-700">Ítem crítico</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold hover:bg-sei-700">
              {item ? 'Guardar cambios' : 'Agregar ítem'}
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

  // Agrupar por sistema
  const porSistema: Record<string, ChecklistItem[]> = {}
  for (const item of items ?? []) {
    if (!porSistema[item.sistema]) porSistema[item.sistema] = []
    porSistema[item.sistema].push(item)
  }

  const { mutate: guardar, isPending: guardando } = useMutation({
    mutationFn: async (data: { id?: string } & Partial<ChecklistItem>) => {
      if (data.id) {
        const { error } = await supabase
          .from('checklist_items').update(data).eq('id', data.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('checklist_items').insert({ ...data, creado_por: usuario?.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'checklist'] })
      invalidarCacheChecklist()
      setModal(null)
    },
  })

  const { mutate: toggleActivo } = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from('checklist_items').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'checklist'] })
      invalidarCacheChecklist()
    },
  })

  const total  = items?.length ?? 0
  const criticos = items?.filter(i => i.critico).length ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Administrar checklists</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} ítems · {criticos} críticos · Cap. XI Manual GSAN-4.1-05-01
          </p>
        </div>
        <button
          onClick={() => setModal('nuevo')}
          className="px-4 py-2 bg-sei-600 text-white text-xs font-semibold rounded-xl
                     hover:bg-sei-700 transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Nuevo ítem
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {/* Fase */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {Object.entries(FASE_LABELS).map(([v, l]) => (
            <button key={v} onClick={() => setFase(v)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                fase === v ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {l.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Programa */}
        <select value={programa} onChange={e => setPrograma(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400">
          <option value="todos">Todos los programas (comunes)</option>
          {Object.entries(PROGRAMA_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Lista por sistemas */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : Object.keys(porSistema).length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            Sin ítems para esta combinación de fase y programa.
            Haz clic en "Nuevo ítem" para agregar.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(porSistema).map(([sistema, sItems]) => (
            <Card key={sistema} padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {sistema}
                </p>
                <span className="text-[11px] text-gray-400">{sItems.length} ítems</span>
              </div>
              <div className="divide-y divide-gray-50">
                {sItems.map(item => (
                  <div key={item.id}
                    className={`flex items-start gap-3 px-4 py-3 ${!item.activo ? 'opacity-40' : ''}`}>
                    {/* Indicador crítico */}
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      item.critico ? 'bg-red-400' : 'bg-gray-200'
                    }`} title={item.critico ? 'Ítem crítico' : 'Ítem normal'}/>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{item.descripcion}</p>
                      <div className="flex gap-2 mt-1">
                        {item.programa_mto && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            {PROGRAMA_LABELS[item.programa_mto]}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">#{item.orden}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setModal(item)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className="text-gray-400">
                          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleActivo({ id: item.id, activo: !item.activo })}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title={item.activo ? 'Desactivar' : 'Activar'}
                      >
                        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"
                          className={item.activo ? 'text-red-400' : 'text-green-500'}>
                          {item.activo
                            ? <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                            : <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalItem
          item={modal === 'nuevo' ? undefined : modal}
          onGuardar={(data) => guardar(
            modal === 'nuevo' ? data : { ...data, id: (modal as ChecklistItem).id }
          )}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  )
}
