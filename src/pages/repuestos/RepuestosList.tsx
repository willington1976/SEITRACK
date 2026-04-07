import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

interface RepuestoItem {
  id: string; numero_parte: string; descripcion: string; tipo: string
  cantidad_stock: number; stock_minimo: number; unidad: string
  proveedor: string | null; estado_stock: string; consumo_30d: number
}

function useInventario() {
  const estacionId = useAuthStore(s => s.usuario?.estacion_id)
  return useQuery({
    queryKey: ['inventario', estacionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('inventario_estacion', {
        p_estacion_id: estacionId!
      })
      if (error) throw error
      return (data ?? []) as RepuestoItem[]
    },
    enabled: !!estacionId,
    refetchInterval: 1000 * 60,
  })
}

function useAjustarStock() {
  const qc           = useQueryClient()
  const usuarioId    = useAuthStore(s => s.usuario?.id)
  const estacionId   = useAuthStore(s => s.usuario?.estacion_id)
  return useMutation({
    mutationFn: async ({ repuestoId, cantidad, tipo, motivo }: {
      repuestoId: string; cantidad: number; tipo: 'entrada'|'salida'|'ajuste'; motivo: string
    }) => {
      const { data: rep } = await supabase
        .from('repuestos').select('cantidad_stock').eq('id', repuestoId).single()
      const antes   = rep?.cantidad_stock ?? 0
      const despues = tipo === 'salida' ? antes - cantidad
                    : tipo === 'entrada' ? antes + cantidad
                    : cantidad

      await supabase.from('repuestos')
        .update({ cantidad_stock: despues }).eq('id', repuestoId)

      await supabase.from('movimientos_inventario').insert({
        repuesto_id: repuestoId, usuario_id: usuarioId,
        tipo, cantidad, cantidad_antes: antes, cantidad_despues: despues, motivo,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  })
}

const estadoBadge: Record<string, { v: 'danger'|'warning'|'success'; l: string }> = {
  agotado: { v: 'danger',  l: 'Agotado' },
  bajo:    { v: 'warning', l: 'Stock bajo' },
  ok:      { v: 'success', l: 'OK' },
}

const tipoColor: Record<string, string> = {
  consumible: 'bg-blue-50 text-blue-700',
  componente: 'bg-purple-50 text-purple-700',
  lubricante: 'bg-amber-50 text-amber-700',
  filtro:     'bg-green-50 text-green-700',
  otro:       'bg-gray-100 text-gray-600',
}

export default function RepuestosList() {
  const { data, isLoading } = useInventario()
  const { mutate: ajustar, isPending } = useAjustarStock()
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [ajuste, setAjuste]       = useState<{ id: string; desc: string } | null>(null)
  const [ajusteForm, setAjusteForm] = useState({ tipo: 'entrada' as 'entrada'|'salida'|'ajuste', cantidad: '', motivo: '' })

  const filtrados = data?.filter(r => {
    const matchBusc = !busqueda ||
      r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.numero_parte.toLowerCase().includes(busqueda.toLowerCase())
    const matchEst = filtroEst === 'todos' || r.estado_stock === filtroEst
    return matchBusc && matchEst
  })

  const alertas = data?.filter(r => r.estado_stock !== 'ok').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Inventario y repuestos</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {data?.length ?? 0} ítems
            {alertas > 0 && <span className="text-amber-600 ml-1">· {alertas} con alerta</span>}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search" placeholder="Buscar parte o descripción..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-48 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"
        />
        {['todos','agotado','bajo','ok'].map(f => (
          <button key={f}
            onClick={() => setFiltroEst(f)}
            className={`px-3 py-2 text-xs rounded-lg transition-colors capitalize ${
              filtroEst === f
                ? 'bg-sei-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'todos' ? 'Todos' : estadoBadge[f]?.l ?? f}
          </button>
        ))}
      </div>

      {/* Modal ajuste stock */}
      {ajuste && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Ajustar stock</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{ajuste.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de movimiento</label>
                <select value={ajusteForm.tipo}
                  onChange={e => setAjusteForm(p => ({ ...p, tipo: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400">
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste inventario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                <input type="number" min="1"
                  value={ajusteForm.cantidad}
                  onChange={e => setAjusteForm(p => ({ ...p, cantidad: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"/>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Motivo</label>
              <input type="text" placeholder="Ej: Compra orden 2024-001..."
                value={ajusteForm.motivo}
                onChange={e => setAjusteForm(p => ({ ...p, motivo: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAjuste(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                disabled={!ajusteForm.cantidad || isPending}
                onClick={() => {
                  ajustar({
                    repuestoId: ajuste.id,
                    cantidad:   Number(ajusteForm.cantidad),
                    tipo:       ajusteForm.tipo,
                    motivo:     ajusteForm.motivo,
                  }, { onSuccess: () => setAjuste(null) })
                }}
                className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold hover:bg-sei-700 disabled:opacity-50">
                {isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg"/></div>
      ) : !filtrados?.length ? (
        <Card><p className="text-sm text-gray-400 text-center py-8">Sin repuestos registrados</p></Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const eb = estadoBadge[r.estado_stock]
            return (
              <div key={r.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
                  r.estado_stock === 'agotado' ? 'border-red-200' :
                  r.estado_stock === 'bajo'    ? 'border-amber-200' : 'border-gray-100'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tipoColor[r.tipo] ?? tipoColor.otro}`}>
                      {r.tipo}
                    </span>
                    <span className="font-mono text-xs text-gray-400">{r.numero_parte}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{r.descripcion}</p>
                  {r.proveedor && <p className="text-[11px] text-gray-400">{r.proveedor}</p>}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {r.cantidad_stock}
                    <span className="text-xs font-normal text-gray-400 ml-1">{r.unidad}</span>
                  </p>
                  <p className="text-[11px] text-gray-400">Mín: {r.stock_minimo}</p>
                  {r.consumo_30d > 0 &&
                    <p className="text-[11px] text-blue-500">-{r.consumo_30d} este mes</p>}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={eb?.v ?? 'muted'}>{eb?.l ?? r.estado_stock}</Badge>
                  <button
                    onClick={() => setAjuste({ id: r.id, desc: r.descripcion })}
                    className="text-[11px] text-sei-600 hover:underline font-medium">
                    Ajustar stock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
