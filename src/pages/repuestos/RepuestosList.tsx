import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useScope } from '@/hooks/useScope'
import { Spinner } from '@/components/ui/Spinner'

interface RepuestoItem {
  id: string; numero_parte: string; descripcion: string; tipo: string
  cantidad_stock: number; stock_minimo: number; unidad: string
  proveedor: string | null; estado_stock: string; consumo_30d: number
}

function useInventario(estacionIdFiltro: string | null) {
  return useQuery({
    queryKey: ['inventario', estacionIdFiltro ?? 'nacional'],
    queryFn: async () => {
      if (!estacionIdFiltro) {
        // Jefe nacional — query directa sin función RPC
        const { data, error } = await supabase
          .from('repuestos')
          .select('*, estacion:estaciones(nombre, codigo_iata)')
          .order('descripcion')
        if (error) throw error
        return (data ?? []).map(r => ({
          ...r,
          estado_stock: r.cantidad_stock === 0 ? 'agotado'
            : r.cantidad_stock <= r.stock_minimo ? 'bajo' : 'ok',
          consumo_30d: 0,
        })) as RepuestoItem[]
      }
      const { data, error } = await supabase.rpc('inventario_estacion', {
        p_estacion_id: estacionIdFiltro
      })
      if (error) throw error
      return (data ?? []) as RepuestoItem[]
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  })
}

function useAjustarStock() {
  const qc        = useQueryClient()
  const usuarioId = useScope().estacionId // solo para log
  return useMutation({
    mutationFn: async ({ repuestoId, cantidad, tipo, motivo, usuId }: {
      repuestoId: string; cantidad: number
      tipo: 'entrada'|'salida'|'ajuste'; motivo: string; usuId: string
    }) => {
      const { data: rep } = await supabase
        .from('repuestos').select('cantidad_stock').eq('id', repuestoId).single()
      const antes   = rep?.cantidad_stock ?? 0
      const despues = tipo === 'salida' ? antes - cantidad
                    : tipo === 'entrada' ? antes + cantidad : cantidad

      await supabase.from('repuestos').update({ cantidad_stock: despues }).eq('id', repuestoId)
      await supabase.from('movimientos_inventario').insert({
        repuesto_id: repuestoId, usuario_id: usuId,
        tipo, cantidad, cantidad_antes: antes, cantidad_despues: despues, motivo,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  })
}

function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones', 'selector'],
    queryFn: async () => {
      const { data } = await supabase
        .from('estaciones').select('id, nombre, codigo_iata').eq('activa', true).order('nombre')
      return data ?? []
    },
  })
}

const TIPO_STYLE: Record<string, string> = {
  consumible: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  componente: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  lubricante: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  filtro:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  otro:       'bg-slate-700/30 text-slate-400 border-white/10',
}

const ESTADO_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  agotado: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'AGOTADO' },
  bajo:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   label: 'STOCK BAJO' },
  ok:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'NOMINAL' },
}

export default function RepuestosList() {
  const { esNacional, estacionId } = useScope()
  const usuarioScope = useScope()

  const [filtroEstacionSel, setFiltroEstacionSel] = useState<string | null>(
    esNacional ? null : estacionId
  )
  const [busqueda,  setBusqueda]  = useState('')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [ajuste,    setAjuste]    = useState<{ id: string; desc: string } | null>(null)
  const [ajusteForm, setAjusteForm] = useState({
    tipo: 'entrada' as 'entrada'|'salida'|'ajuste', cantidad: '', motivo: ''
  })

  const estacionFiltro = esNacional ? filtroEstacionSel : estacionId
  const { data, isLoading }      = useInventario(estacionFiltro)
  const { data: estaciones }     = useEstaciones()
  const { mutate: ajustar, isPending } = useAjustarStock()

  const filtrados = data?.filter(r => {
    const matchBusc = !busqueda ||
      r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.numero_parte.toLowerCase().includes(busqueda.toLowerCase())
    const matchEst = filtroEst === 'todos' || r.estado_stock === filtroEst
    return matchBusc && matchEst
  })

  const alertas = data?.filter(r => r.estado_stock !== 'ok').length ?? 0
  const agotados = data?.filter(r => r.estado_stock === 'agotado').length ?? 0

  return (
    <div className="relative space-y-5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-1">
            Logistics Hub Inventory
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">CONTROL DE REPUESTOS</h1>
          <p className="text-slate-400 text-xs mt-1">
            {data?.length ?? 0} items en bodega
            {alertas > 0 && (
              <span className="text-amber-400 ml-2">· {alertas} alertas activas</span>
            )}
          </p>
        </div>
      </div>

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Total Items',   v: data?.length ?? 0, c: 'text-white' },
            { l: 'Stock Bajo',    v: alertas - agotados, c: alertas > 0 ? 'text-amber-400' : 'text-slate-500' },
            { l: 'Agotados',      v: agotados,           c: agotados > 0 ? 'text-red-400' : 'text-slate-500' },
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
        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-5.44-2.32a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"/>
          </svg>
          <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar parte o descripción técnica..."
            className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-slate-200 placeholder-slate-600
                       focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
        </div>

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
            { v: 'todos',   l: 'VER TODO' },
            { v: 'agotado', l: 'STOCK AGOTADO' },
            { v: 'bajo',    l: 'STOCK BAJO' },
            { v: 'ok',      l: 'SISTEMA NOMINAL' },
          ].map(f => (
            <button key={f.v} onClick={() => setFiltroEst(f.v)}
              className={`px-3 py-1.5 text-[9px] rounded-lg font-bold uppercase tracking-wider
                         transition-all ${
                filtroEst === f.v
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Modal ajuste stock */}
      {ajuste && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl w-full max-w-sm border border-white/10 p-6 space-y-4">
            <div>
              <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-400/70 mb-0.5">
                Inventory Control
              </p>
              <p className="text-sm font-bold text-white">Ajustar Stock</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{ajuste.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  Tipo de Movimiento
                </label>
                <select value={ajusteForm.tipo}
                  onChange={e => setAjusteForm(p => ({ ...p, tipo: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                             text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30">
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste inventario</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  Cantidad
                </label>
                <input type="number" min="1" value={ajusteForm.cantidad}
                  onChange={e => setAjusteForm(p => ({ ...p, cantidad: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                             text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                Motivo
              </label>
              <input type="text" placeholder="Ej: Compra OC-2024-001..."
                value={ajusteForm.motivo}
                onChange={e => setAjusteForm(p => ({ ...p, motivo: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
                           text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAjuste(null)}
                className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm
                           text-slate-400 hover:bg-white/5 transition-colors">
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
                    usuId:      'system', // el servicio ya tiene el usuarioId
                  }, { onSuccess: () => setAjuste(null) })
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                           font-bold hover:bg-blue-500 disabled:opacity-40 transition-colors">
                {isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg"/></div>
      ) : !filtrados?.length ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest">
            No se encontraron registros para la búsqueda
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const es = ESTADO_STYLE[r.estado_stock]
            const ts = TIPO_STYLE[r.tipo] ?? TIPO_STYLE.otro
            return (
              <div key={r.id}
                className={`glass-panel rounded-2xl border transition-all
                           flex items-center gap-4 px-5 py-4 ${
                  r.estado_stock === 'agotado' ? 'border-red-500/20' :
                  r.estado_stock === 'bajo'    ? 'border-amber-500/20' :
                  'border-white/5 hover:border-white/10'
                }`}>

                {/* Tipo */}
                <div className="shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${ts}`}>
                    {r.tipo}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{r.descripcion}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-slate-500">{r.numero_parte}</span>
                    {r.proveedor && (
                      <span className="text-[9px] text-slate-600">· {r.proveedor}</span>
                    )}
                  </div>
                </div>

                {/* Stock */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold font-mono text-white">
                    {r.cantidad_stock}
                    <span className="text-xs font-normal text-slate-500 ml-1">{r.unidad}</span>
                  </p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wide">
                    Mín: {r.stock_minimo}
                  </p>
                  {r.consumo_30d > 0 && (
                    <p className="text-[9px] text-blue-400 font-mono">-{r.consumo_30d} / mes</p>
                  )}
                </div>

                {/* Estado + acción */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                                   uppercase tracking-wide ${es.bg} ${es.text} ${es.border}`}>
                    {es.label}
                  </span>
                  <button
                    onClick={() => setAjuste({ id: r.id, desc: r.descripcion })}
                    className="text-[9px] text-blue-400 hover:text-blue-300 uppercase
                               tracking-widest font-semibold transition-colors">
                    Ajustar Stock →
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
