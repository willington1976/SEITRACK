import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

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

const estadoBadge: Record<string, { color: string; l: string; bar: string }> = {
  agotado: { color: 'text-red-500 bg-red-500/10 border-red-500/20', l: 'STOCK AGOTADO', bar: 'bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.4)]' },
  bajo:    { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', l: 'STOCK BAJO', bar: 'bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
  ok:      { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', l: 'SISTEMA NOMINAL', bar: 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
}

const tipoColor: Record<string, string> = {
  consumible: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  componente: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  lubricante: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  filtro:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  otro:       'text-slate-400 bg-slate-400/10 border-slate-400/20',
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
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1 h-3 bg-blue-600 rounded-full" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Logistics Hub Inventory</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Control de Repuestos</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
             {data?.length ?? 0} ITEMS EN BODEGA · {alertas} ALERTAS ACTIVAS
          </p>
        </div>
      </div>

      {/* Filtros Aero */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[280px] relative">
           <input
             type="search" 
             placeholder="BUSCAR PARTE O DESCRIPCIÓN TÉCNICA..."
             value={busqueda} 
             onChange={e => setBusqueda(e.target.value)}
             className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white uppercase placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
           />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['todos','agotado','bajo','ok'].map(f => (
            <button key={f}
              onClick={() => setFiltroEst(f)}
              className={cn(
                'px-4 py-3 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest border whitespace-nowrap',
                filtroEst === f
                  ? 'bg-blue-600 text-white border-white/20 shadow-lg'
                  : 'bg-slate-950 border-white/5 text-slate-600 hover:text-slate-300'
              )}
            >
              {f === 'todos' ? 'VER TODO' : (estadoBadge[f]?.l || f)}
            </button>
          ))}
        </div>
      </div>

      {/* Modal ajuste stock Aero */}
      {ajuste && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="glass-panel border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
            
            <div>
               <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[.25em] mb-1">Stock Adjustment Protocol</p>
               <h3 className="text-lg font-bold text-white uppercase tracking-tight truncate">{ajuste.desc}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Operación</label>
                <select value={ajusteForm.tipo}
                  onChange={e => setAjusteForm(p => ({ ...p, tipo: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                  <option value="entrada">ENTRADA STOCK</option>
                  <option value="salida">SALIDA CONSUMO</option>
                  <option value="ajuste">AJUSTE INVENTARIO</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cantidad</label>
                <input type="number" min="1"
                  value={ajusteForm.cantidad}
                  onChange={e => setAjusteForm(p => ({ ...p, cantidad: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Memo / Justificación Operativa</label>
              <input type="text" placeholder="REF: ORD-TRAB-2024..."
                value={ajusteForm.motivo}
                onChange={e => setAjusteForm(p => ({ ...p, motivo: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase font-mono"/>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAjuste(null)}
                className="flex-1 py-4 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-slate-200 uppercase tracking-widest transition-all">
                Abortar
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
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold hover:bg-blue-500 disabled:opacity-50 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20">
                {isPending ? 'PROCESANDO...' : 'CONFIRMAR AJUSTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista Aero */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
           <Spinner size="lg" />
           <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Indexando Almacén...</p>
        </div>
      ) : !filtrados?.length ? (
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl py-16">
          <p className="text-xs font-bold text-slate-500 text-center uppercase tracking-[.25em]">No se encontraron registros para la búsqueda</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtrados.map(r => {
            const eb = estadoBadge[r.estado_stock] || estadoBadge.ok
            return (
              <div key={r.id}
                className="glass-panel border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5 relative overflow-hidden group hover:border-white/20 transition-all">
                
                {/* Status bar */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", eb.bar)} />

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter", tipoColor[r.tipo] || tipoColor.otro)}>
                      {r.tipo}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                       P/N: {r.numero_parte}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{r.descripcion}</h3>
                  {r.proveedor && (
                    <div className="flex items-center gap-2">
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <p className="text-[10px] text-slate-500 uppercase font-mono">{r.proveedor}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-8 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1.5">
                       <p className="text-2xl font-bold font-mono text-white leading-none">
                         {r.cantidad_stock}
                       </p>
                       <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{r.unidad}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1">STOCK MÍN: {r.stock_minimo}</p>
                    {r.consumo_30d > 0 &&
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter flex items-center justify-end gap-1">
                         <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                         -{r.consumo_30d} 30D LOG
                      </p>
                    }
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <Badge className={cn("px-3 py-1 font-bold text-[9px] border uppercase tracking-widest whitespace-nowrap", eb.color)}>
                      {eb.l}
                    </Badge>
                    <button
                      onClick={() => setAjuste({ id: r.id, desc: r.descripcion })}
                      className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-[9px] font-bold text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-all uppercase tracking-widest">
                      Comandar Stock
                    </button>
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
