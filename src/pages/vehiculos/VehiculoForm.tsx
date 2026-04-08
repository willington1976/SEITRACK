import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import { useAuthStore } from '@/stores/auth.store'
import { MarcaVehiculo, ProgramaMTO, EstadoVehiculo } from '@/core/enums'
import { QUERY_KEYS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Vehiculo } from '@/core/types'

// ─── Relación marca → modelos → programa MTO ─────────────────────────────────

const MARCA_CONFIG: Record<MarcaVehiculo, {
  label: string; modelos: string[]; programa: ProgramaMTO
}> = {
  [MarcaVehiculo.OshkoshSerieT]: {
    label:   'Oshkosh Serie T',
    modelos: ['T-1500', 'T-6', 'T-12', 'T-1000', 'P-19'],
    programa: ProgramaMTO.SerieT,
  },
  [MarcaVehiculo.OshkoshStriker]: {
    label:   'Oshkosh Striker 1500',
    modelos: ['Striker 1500', 'Striker 3000'],
    programa: ProgramaMTO.Striker1500,
  },
  [MarcaVehiculo.Rosenbauer]: {
    label:   'Rosenbauer Panther 4×4',
    modelos: ['Panther 4×4', 'Panther 6×6', 'Panther 8×8'],
    programa: ProgramaMTO.Panther4x4,
  },
}

const ANO_MIN = 1990
const ANO_MAX = new Date().getFullYear() + 1

// ─── Formulario ───────────────────────────────────────────────────────────────

interface FormState {
  matricula: string; numero_serie: string; marca: MarcaVehiculo | ''
  modelo: string; anio: string; kilometraje_actual: string
  horas_motor: string; fecha_adquisicion: string; estado: EstadoVehiculo
}

const FORM_VACIO: FormState = {
  matricula:          '',
  numero_serie:       '',
  marca:              '',
  modelo:             '',
  anio:               String(new Date().getFullYear()),
  kilometraje_actual: '0',
  horas_motor:        '0',
  fecha_adquisicion:  new Date().toISOString().split('T')[0],
  estado:             EstadoVehiculo.Operativo,
}

export default function VehiculoForm() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const usuario     = useAuthStore(s => s.usuario)
  const estacionId  = usuario?.estacion_id

  const [form, setForm]   = useState<FormState>(FORM_VACIO)
  const [errorStatus, setErrorStatus] = useState('')

  const modelosDisponibles = form.marca ? MARCA_CONFIG[form.marca as MarcaVehiculo].modelos : []
  const programaMTO = form.marca ? MARCA_CONFIG[form.marca as MarcaVehiculo].programa : null

  function setField(k: keyof FormState, v: string) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'marca') next.modelo = ''
      return next
    })
    setErrorStatus('')
  }

  function validar(): string | null {
    if (!form.matricula.trim()) return 'La matrícula es obligatoria'
    if (!form.numero_serie.trim()) return 'El número de serie es obligatorio'
    if (!form.marca) return 'Selecciona una marca'
    if (!form.modelo) return 'Selecciona un modelo'
    const anio = Number(form.anio)
    if (isNaN(anio) || anio < ANO_MIN || anio > ANO_MAX) return `El año debe estar entre ${ANO_MIN} y ${ANO_MAX}`
    if (!form.fecha_adquisicion) return 'La fecha de adquisición es obligatoria'
    return null
  }

  const { mutate: crear, isPending } = useMutation({
    mutationFn: async () => {
      const err = validar(); if (err) throw new Error(err)
      if (!estacionId) throw new Error('No tienes estación asignada')

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const vehiculo: Vehiculo = {
        id, estacion_id: estacionId, matricula: form.matricula.trim().toUpperCase(),
        numero_serie: form.numero_serie.trim().toUpperCase(), marca: form.marca as MarcaVehiculo,
        modelo: form.modelo, anio: Number(form.anio), kilometraje_actual: Number(form.kilometraje_actual) || 0,
        horas_motor: Number(form.horas_motor) || 0, estado: form.estado, fecha_adquisicion: form.fecha_adquisicion,
        programa_mto: programaMTO!, created_at: now,
      }

      await db.vehiculos.add(vehiculo)
      try {
        const { error: sbErr } = await supabase.from('vehiculos').insert(vehiculo)
        if (sbErr) throw sbErr
      } catch {
        await enqueue({ tabla: 'vehiculos', operacion: 'INSERT', payload: vehiculo as any })
      }
      return vehiculo
    },
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: QUERY_KEYS.vehiculos(estacionId!) }); navigate(`/vehiculos/${v.id}`) },
    onError: (err: Error) => setErrorStatus(err.message),
  })

  return (
    <div className="space-y-8 max-w-3xl page-enter pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center hover:bg-white/5 text-slate-400 transition-all">
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Alta de Unidad MRE</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 italic">Ingreso al Registro Nacional de Flota</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const err = validar(); if (err) { setErrorStatus(err); return }; crear() }} className="space-y-6">
        
        {/* Identificación */}
        <div className="glass-panel rounded-3xl p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600/50" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Identificación de Célula</h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 italic">Parámetros únicos de registro</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Matrícula / Indicador *</label>
              <input type="text" value={form.matricula} onChange={e => setField('matricula', e.target.value)} placeholder="SEI-XXX-000"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white uppercase font-mono placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Número de Serie (VIN) *</label>
              <input type="text" value={form.numero_serie} onChange={e => setField('numero_serie', e.target.value)} placeholder="REGISTRO FUSELAJE..."
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white uppercase font-mono placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
          </div>
        </div>

        {/* Fabricante y Modelo */}
        <div className="glass-panel rounded-3xl p-8 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Sistemas y Motorización</h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 italic">Configuración de plataforma y fabricante</p>
          </div>
          
          <div className="space-y-4">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 block">Fabricante Autorizado</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(MARCA_CONFIG).map(([valor, cfg]) => (
                <label key={valor} className={cn('flex flex-col gap-1 p-5 rounded-2xl border cursor-pointer transition-all relative group overflow-hidden', form.marca === valor ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/10' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300')}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn("text-[10px] font-bold uppercase tracking-tight", form.marca === valor ? "text-blue-400" : "text-slate-400")}>{cfg.label.split(' ')[0]}</p>
                    <input type="radio" name="marca" value={valor} checked={form.marca === valor} onChange={e => setField('marca', e.target.value)} className="hidden"/>
                    {form.marca === valor && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                  <p className="text-[9px] uppercase leading-none italic">{cfg.label.split(' ').slice(1).join(' ')}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Designación de Modelo *</label>
              <select disabled={!form.marca} value={form.modelo} onChange={e => setField('modelo', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-30 appearance-none">
                <option value="" className="bg-slate-950">SELECT MODEL...</option>
                {modelosDisponibles.map(m => <option key={m} value={m} className="bg-slate-950 text-white">{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Año de Fabricación *</label>
              <input type="number" min={ANO_MIN} max={ANO_MAX} value={form.anio} onChange={e => setField('anio', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
             <div className={cn("rounded-2xl p-5 border transition-all flex items-center gap-4", programaMTO ? "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5" : "bg-slate-950/50 border-white/5 opacity-40")}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border text-lg", programaMTO ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-slate-900 border-white/5 text-slate-700")}>⚙️</div>
                <div>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocolo MTO</p>
                   <p className="text-[11px] font-bold text-emerald-400 font-mono tracking-tighter uppercase">{programaMTO || 'WAITTING...'}</p>
                </div>
             </div>
             <div className="space-y-1.5 text-right">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 block">Fecha de Comisión *</label>
                <input type="date" value={form.fecha_adquisicion} onChange={e => setField('fecha_adquisicion', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
          </div>
        </div>

        {/* Telemetría */}
        <div className="glass-panel rounded-3xl p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Estado de Flota</label>
              <select value={form.estado} onChange={e => setField('estado', e.target.value as EstadoVehiculo)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none">
                <option value={EstadoVehiculo.Operativo} className="bg-slate-950">OPERATIVO</option>
                <option value={EstadoVehiculo.EnMantenimiento} className="bg-slate-950 text-amber-500">MANTENIMIENTO</option>
                <option value={EstadoVehiculo.FueraDeServicio} className="bg-slate-950 text-red-500">FUERA SERVICIO</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Lectura Odómetro (KM)</label>
              <input type="number" min="0" value={form.kilometraje_actual} onChange={e => setField('kilometraje_actual', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Lectura Horas (Engine)</label>
              <input type="number" min="0" value={form.horas_motor} onChange={e => setField('horas_motor', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
            </div>
          </div>
        </div>

        {errorStatus && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-4 flex items-center gap-4 text-red-500 animate-pulse">
            <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">ERROR DE SISTEMA: {errorStatus.toUpperCase()}</span>
          </div>
        )}

        <div className="flex gap-4 pt-4 pt-10 border-t border-white/5">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-4 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest">Desestimar Registro</button>
          <button type="submit" disabled={isPending}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10 flex items-center justify-center gap-3">
            {isPending ? 'SINCRO EN CURSO...' : 'CONFIRMAR INGRESO →'}
          </button>
        </div>
      </form>
    </div>
  )
}
