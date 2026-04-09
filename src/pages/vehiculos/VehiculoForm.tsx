// ─── VehiculoForm — Registro y edición de MRE ────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/Spinner'
import { MarcaVehiculo, ProgramaMTO, EstadoVehiculo, Rol } from '@/core/enums'

// ─── Configuración marca → modelos → programa MTO ────────────────────────────

const MARCA_CONFIG: Record<string, { label: string; modelos: string[]; programa: ProgramaMTO }> = {
  [MarcaVehiculo.OshkoshSerieT]:  { label: 'Oshkosh',     modelos: ['Striker 1500', 'Striker 3000', 'Striker 4500'], programa: ProgramaMTO.Striker1500 },
  [MarcaVehiculo.Rosenbauer]:     { label: 'Rosenbauer',  modelos: ['Panther 4×4', 'Panther 6×6', 'Panther CA5'],   programa: ProgramaMTO.Panther4x4  },
  [MarcaVehiculo.E_ONE]:          { label: 'E-ONE',       modelos: ['Titan HPR', 'Cyclone II'],                      programa: ProgramaMTO.SerieT      },
  [MarcaVehiculo.SimplexGrinnell]:{ label: 'Simplex',     modelos: ['Javelin', 'Eagle'],                             programa: ProgramaMTO.SerieT      },
}

const ESTADO_OPTS = [
  { v: EstadoVehiculo.Operativo,       l: 'Operativo' },
  { v: EstadoVehiculo.EnMantenimiento, l: 'En mantenimiento' },
  { v: EstadoVehiculo.FueraDeServicio, l: 'Fuera de servicio' },
]

const INPUT = `w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5
  text-sm text-slate-200 placeholder-slate-600
  focus:outline-none focus:ring-1 focus:ring-blue-500/30`

const LABEL = `block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5`

const ANO_MIN = 1990
const ANO_MAX = new Date().getFullYear() + 1

// ─── Hook estaciones ─────────────────────────────────────────────────────────

function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estaciones')
        .select('id, nombre, codigo_iata, ciudad, regional:regionales(nombre, codigo)')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

function useVehiculoEditar(id?: string) {
  return useQuery({
    queryKey: ['vehiculo', 'editar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VehiculoForm() {
  const navigate    = useNavigate()
  const { vehiculoId } = useParams<{ vehiculoId?: string }>()
  const esEdicion   = !!vehiculoId
  const qc          = useQueryClient()
  const usuario     = useAuthStore(s => s.usuario)
  const rol         = usuario?.rol as Rol
  const puedeElegirEstacion = rol === Rol.JefeNacional || rol === Rol.JefeRegional

  const { data: estaciones, isLoading: loadingEst } = useEstaciones()
  const { data: vehiculoExistente, isLoading: loadingV } = useVehiculoEditar(vehiculoId)

  const [form, setForm] = useState({
    matricula:          '',
    numero_serie:       '',
    marca:              '' as MarcaVehiculo | '',
    modelo:             '',
    anio:               String(new Date().getFullYear()),
    kilometraje_actual: '0',
    horas_motor:        '0',
    fecha_adquisicion:  new Date().toISOString().split('T')[0],
    estado:             EstadoVehiculo.Operativo as EstadoVehiculo,
    estacion_id:        usuario?.estacion_id ?? '',
  })

  const [error,     setError]     = useState('')
  const [guardando, setGuardando] = useState(false)

  // Pre-poblar si es edición
  useEffect(() => {
    if (vehiculoExistente) {
      setForm({
        matricula:          vehiculoExistente.matricula ?? '',
        numero_serie:       vehiculoExistente.numero_serie ?? '',
        marca:              vehiculoExistente.marca ?? '',
        modelo:             vehiculoExistente.modelo ?? '',
        anio:               String(vehiculoExistente.anio ?? new Date().getFullYear()),
        kilometraje_actual: String(vehiculoExistente.kilometraje_actual ?? 0),
        horas_motor:        String(vehiculoExistente.horas_motor ?? 0),
        fecha_adquisicion:  vehiculoExistente.fecha_adquisicion ?? new Date().toISOString().split('T')[0],
        estado:             vehiculoExistente.estado ?? EstadoVehiculo.Operativo,
        estacion_id:        vehiculoExistente.estacion_id ?? usuario?.estacion_id ?? '',
      })
    }
  }, [vehiculoExistente])

  function set(k: string, v: string) {
    setForm(p => {
      const next: any = { ...p, [k]: v }
      // Auto-seleccionar primer modelo al cambiar marca
      if (k === 'marca' && v && MARCA_CONFIG[v]) {
        next.modelo = MARCA_CONFIG[v].modelos[0]
      }
      return next
    })
  }

  function validar(): string {
    if (!form.matricula.trim())    return 'La matrícula es obligatoria'
    if (!form.numero_serie.trim()) return 'El número de serie es obligatorio'
    if (!form.marca)               return 'Selecciona la marca'
    if (!form.modelo)              return 'Selecciona el modelo'
    if (!form.estacion_id)         return 'Selecciona la estación'
    const anio = Number(form.anio)
    if (isNaN(anio) || anio < ANO_MIN || anio > ANO_MAX)
      return `El año debe estar entre ${ANO_MIN} y ${ANO_MAX}`
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validar()
    if (err) { setError(err); return }
    setError('')
    setGuardando(true)

    try {
      const programa = MARCA_CONFIG[form.marca as MarcaVehiculo]?.programa ?? ProgramaMTO.Panther4x4
      const payload = {
        matricula:          form.matricula.trim().toUpperCase(),
        numero_serie:       form.numero_serie.trim().toUpperCase(),
        marca:              form.marca,
        modelo:             form.modelo,
        anio:               Number(form.anio),
        kilometraje_actual: Number(form.kilometraje_actual) || 0,
        horas_motor:        Number(form.horas_motor) || 0,
        fecha_adquisicion:  form.fecha_adquisicion || null,
        estado:             form.estado,
        estacion_id:        form.estacion_id,
        programa_mto:       programa,
      }

      if (esEdicion) {
        const { error } = await supabase.from('vehiculos').update(payload).eq('id', vehiculoId!)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehiculos').insert(payload)
        if (error) throw error
      }

      qc.invalidateQueries({ queryKey: ['vehiculos'] })
      qc.invalidateQueries({ queryKey: ['vehiculo'] })
      navigate('/vehiculos')
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (esEdicion && loadingV) return <div className="flex justify-center py-20"><Spinner size="lg"/></div>

  const modelosDisponibles = form.marca ? MARCA_CONFIG[form.marca]?.modelos ?? [] : []

  return (
    <div className="relative space-y-5 max-w-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none"/>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 glass-panel rounded-xl border border-white/5 hover:border-white/10 transition-all">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-slate-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div>
          <p className="text-[9px] text-blue-400/70 uppercase tracking-widest font-semibold">
            {esEdicion ? 'Editar MRE' : 'Nueva MRE'}
          </p>
          <h1 className="text-xl font-bold text-white">
            {esEdicion ? 'ACTUALIZAR VEHÍCULO' : 'REGISTRAR VEHÍCULO'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Sección 1 — Identificación */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Identificación de la Unidad
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Matrícula *</label>
              <input type="text" value={form.matricula}
                onChange={e => set('matricula', e.target.value.toUpperCase())}
                placeholder="BRI630 / SEI-071"
                className={`${INPUT} font-mono font-bold`}/>
            </div>
            <div>
              <label className={LABEL}>Número de Serie *</label>
              <input type="text" value={form.numero_serie}
                onChange={e => set('numero_serie', e.target.value.toUpperCase())}
                placeholder="SN-2020-00123"
                className={`${INPUT} font-mono`}/>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LABEL}>Marca *</label>
              <select value={form.marca} onChange={e => set('marca', e.target.value)}
                className={INPUT}>
                <option value="">Seleccionar...</option>
                {Object.entries(MARCA_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Modelo *</label>
              <select value={form.modelo} onChange={e => set('modelo', e.target.value)}
                disabled={!form.marca}
                className={INPUT}>
                <option value="">Seleccionar...</option>
                {modelosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Año de fabricación *</label>
              <input type="number" value={form.anio}
                onChange={e => set('anio', e.target.value)}
                min={ANO_MIN} max={ANO_MAX}
                className={INPUT}/>
            </div>
          </div>
        </div>

        {/* Sección 2 — Asignación */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Asignación Operacional
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className={puedeElegirEstacion ? 'col-span-2' : 'col-span-2'}>
              <label className={LABEL}>Estación asignada *</label>
              {puedeElegirEstacion ? (
                <select value={form.estacion_id}
                  onChange={e => set('estacion_id', e.target.value)}
                  disabled={loadingEst}
                  className={INPUT}>
                  <option value="">Seleccionar estación...</option>
                  {(estaciones ?? []).map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo_iata} — {e.nombre} · {(e.regional as any)?.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`${INPUT} opacity-60 cursor-not-allowed`}>
                  {estaciones?.find((e: any) => e.id === form.estacion_id)?.nombre ?? 'Tu estación asignada'}
                </div>
              )}
            </div>

            <div>
              <label className={LABEL}>Estado actual</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}
                className={INPUT}>
                {ESTADO_OPTS.map(o => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Fecha de adquisición</label>
              <input type="date" value={form.fecha_adquisicion}
                onChange={e => set('fecha_adquisicion', e.target.value)}
                className={INPUT}/>
            </div>
          </div>
        </div>

        {/* Sección 3 — Odómetro */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Telemetría Inicial
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Kilometraje actual (km)</label>
              <input type="number" min="0" value={form.kilometraje_actual}
                onChange={e => set('kilometraje_actual', e.target.value)}
                placeholder="0"
                className={`${INPUT} font-mono`}/>
            </div>
            <div>
              <label className={LABEL}>Horas de motor (h)</label>
              <input type="number" min="0" value={form.horas_motor}
                onChange={e => set('horas_motor', e.target.value)}
                placeholder="0"
                className={`${INPUT} font-mono`}/>
            </div>
          </div>

          {/* Resumen programa MTO */}
          {form.marca && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                Programa de mantenimiento:
              </span>
              <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10
                               border border-blue-500/20 px-2 py-0.5 rounded font-mono uppercase">
                {MARCA_CONFIG[form.marca]?.programa ?? '—'}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-white/10 rounded-xl text-xs
                       text-slate-400 font-bold uppercase tracking-widest
                       hover:bg-white/5 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                       text-xs font-bold uppercase tracking-widest transition-all
                       disabled:opacity-40 shadow-lg shadow-blue-600/20">
            {guardando ? 'Guardando...' : esEdicion ? '✓ Actualizar MRE' : '+ Registrar MRE'}
          </button>
        </div>
      </form>
    </div>
  )
}
