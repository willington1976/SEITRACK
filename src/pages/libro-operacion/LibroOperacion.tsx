import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import { useVehiculo } from '@/hooks/useVehiculos'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, cn } from '@/lib/utils'
import { TURNO_LABELS } from '@/lib/constants'
import type { LibroOperacion as TLibro } from '@/core/types'

const tipoLabel: Record<string, { l: string; v: 'default' | 'success' | 'warning' | 'info' | 'muted'; color: string; bg: string }> = {
  novedad:        { l: 'NOVEDAD',        v: 'warning', color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  mantenimiento:  { l: 'MANTENIMIENTO',  v: 'info',    color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  operacion:      { l: 'OPERACIÓN',      v: 'default', color: 'text-slate-300',   bg: 'bg-slate-300/10' },
  combustible:    { l: 'COMBUSTIBLE',    v: 'success', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  agente_extintor:{ l: 'AGENTE EXT',     v: 'muted',   color: 'text-slate-500',   bg: 'bg-slate-500/10' },
}

function useLibro(vehiculoId: string) {
  return useQuery({
    queryKey: ['libro', vehiculoId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('libro_operacion')
          .select('*, usuario:usuarios(nombre_completo)')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        await db.libro_operacion.bulkPut(data as TLibro[])
        return data as TLibro[]
      } catch {
        return db.libro_operacion.where('vehiculo_id').equals(vehiculoId).reverse().limit(100).toArray()
      }
    },
    enabled: !!vehiculoId,
  })
}

export default function LibroOperacion() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { data: vehiculo }  = useVehiculo(vehiculoId!)
  const { data: entradas, isLoading } = useLibro(vehiculoId!)
  const usuario  = useAuthStore(s => s.usuario)
  const qc       = useQueryClient()

  const [form, setForm] = useState({
    tipo:                 'operacion',
    turno:                'dia',
    anotacion:            '',
    km_registro:          '',
    horas_registro:       '',
    nivel_combustible:    '',
    nivel_agente_extintor:'',
  })
  const [guardando, setGuardando] = useState(false)

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.anotacion.trim() || !usuario || !vehiculoId) return
    setGuardando(true)

    const entrada: TLibro = {
      id:                    crypto.randomUUID(),
      vehiculo_id:           vehiculoId,
      usuario_id:            usuario.id,
      fecha:                 new Date().toISOString().split('T')[0],
      turno:                 form.turno as TLibro['turno'],
      anotacion:             form.anotacion,
      tipo_entrada:          form.tipo as TLibro['tipo_entrada'],
      km_registro:           Number(form.km_registro) || vehiculo?.kilometraje_actual || 0,
      horas_registro:        Number(form.horas_registro) || vehiculo?.horas_motor || 0,
      nivel_combustible:     form.nivel_combustible || undefined,
      nivel_agente_extintor: form.nivel_agente_extintor || undefined,
      created_at:            new Date().toISOString(),
    }

    await db.libro_operacion.add(entrada)
    try {
      const { error } = await supabase.from('libro_operacion').insert(entrada)
      if (error) throw error
    } catch {
      await enqueue({ tabla: 'libro_operacion', operacion: 'INSERT', payload: { ...entrada } as any })
    }

    setForm({ tipo: 'operacion', turno: 'dia', anotacion: '', km_registro: '', horas_registro: '', nivel_combustible: '', nivel_agente_extintor: '' })
    qc.invalidateQueries({ queryKey: ['libro', vehiculoId] })
    setGuardando(false)
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Flight Logbook Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-3 bg-blue-600 rounded-full" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Vehicle Operations Log</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            Libro de Operación <span className="text-blue-500 font-mono text-sm ml-2">{vehiculo?.matricula}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.2em] mt-1 italic">
             {entradas?.length ?? 0} ENTRADAS REGISTRADAS EN BITÁCORA
          </p>
        </div>
      </div>

      {/* Formulario Nueva Entrada Estilo Industrial */}
      <div className="glass-panel rounded-2xl p-6 border-blue-500/20">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
           <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Nueva Anotación Técnica</p>
        </div>
        
        <form onSubmit={handleGuardar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Clasificación</label>
              <select
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              >
                {Object.entries(tipoLabel).map(([v, { l }]) => (
                  <option key={v} value={v} className="bg-slate-900">{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Turno Operativo</label>
              <select
                value={form.turno}
                onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              >
                {Object.entries(TURNO_LABELS).map(([v, l]) => (
                  <option key={v} value={v} className="bg-slate-900">{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Reporte de Novedad / Actividad</label>
            <textarea
              rows={3}
              placeholder="DESCRIBA LA OPERACIÓN O DISCREPANCIA DETECTADA..."
              value={form.anotacion}
              onChange={e => setForm(p => ({ ...p, anotacion: e.target.value }))}
              required
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none uppercase font-mono"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { k: 'km_registro',      ph: `${vehiculo?.kilometraje_actual ?? 0}`, l: 'KM ACTUAL' },
              { k: 'horas_registro',   ph: `${vehiculo?.horas_motor ?? 0}`,    l: 'HORAS MOT' },
              { k: 'nivel_combustible',     ph: 'EJ: 3/4',    l: 'COMBUST' },
              { k: 'nivel_agente_extintor', ph: 'EJ: 100%',   l: 'AGENTE' },
            ].map(f => (
              <div key={f.k} className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">{f.l}</label>
                <input
                  type={f.k.includes('km') || f.k.includes('horas') ? 'number' : 'text'}
                  placeholder={f.ph}
                  value={(form as any)[f.k]}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={guardando || !form.anotacion.trim()}
            className="w-full py-4 bg-blue-600 text-white text-[11px] font-bold rounded-2xl hover:bg-blue-500 disabled:opacity-50 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10"
          >
            {guardando ? 'SINCRONIZANDO...' : 'REGISTRAR EN BITÁCORA →'}
          </button>
        </form>
      </div>

      {/* Historial de Entradas Estilo Card-Aero */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner />
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Leyendo Caja Negra...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entradas?.map(e => {
            const tl = tipoLabel[e.tipo_entrada] ?? { l: e.tipo_entrada.toUpperCase(), v: 'muted', color: 'text-slate-500', bg: 'bg-slate-500/10' }
            const autorNombre = (e.usuario as { nombre_completo: string } | undefined)?.nombre_completo
            return (
              <div key={e.id} className="glass-panel rounded-2xl p-5 border-l-4 border-l-slate-800 transition-all hover:border-l-blue-500 group relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest", tl.color, tl.bg, tl.color.replace('text', 'border'))}>
                        {tl.l}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        TURNO {e.turno.toUpperCase()} · {formatDateTime(e.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-100 uppercase tracking-tight font-mono leading-relaxed">
                       {e.anotacion}
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                      {[
                        { l: 'KM', v: e.km_registro > 0 ? e.km_registro.toLocaleString('es-CO') : null },
                        { l: 'HORAS', v: e.horas_registro > 0 ? e.horas_registro.toLocaleString('es-CO') : null },
                        { l: 'FUEL', v: e.nivel_combustible },
                        { l: 'EXT', v: e.nivel_agente_extintor },
                      ].filter(i => i.v).map(i => (
                        <div key={i.l} className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{i.l}:</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{i.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {autorNombre && (
                    <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 self-start">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{autorNombre.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
