import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { db } from '@/db/dexie'
import { enqueue } from '@/db/sync-queue'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { MarcaVehiculo, ProgramaMTO, EstadoVehiculo } from '@/core/enums'
import { QUERY_KEYS } from '@/lib/constants'
import type { Vehiculo } from '@/core/types'

// ─── Relación marca → modelos → programa MTO ─────────────────────────────────

const MARCA_CONFIG: Record<MarcaVehiculo, {
  label: string
  modelos: string[]
  programa: ProgramaMTO
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
  matricula:          string
  numero_serie:       string
  marca:              MarcaVehiculo | ''
  modelo:             string
  anio:               string
  kilometraje_actual: string
  horas_motor:        string
  fecha_adquisicion:  string
  estado:             EstadoVehiculo
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
  const [error, setError] = useState('')

  // Modelos disponibles según la marca seleccionada
  const modelosDisponibles = form.marca
    ? MARCA_CONFIG[form.marca as MarcaVehiculo].modelos
    : []

  // Programa MTO auto-asignado
  const programaMTO = form.marca
    ? MARCA_CONFIG[form.marca as MarcaVehiculo].programa
    : null

  function setField(k: keyof FormState, v: string) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      // Al cambiar marca, resetear modelo
      if (k === 'marca') next.modelo = ''
      return next
    })
    setError('')
  }

  // ── Validaciones ────────────────────────────────────────────────────────────

  function validar(): string | null {
    if (!form.matricula.trim())    return 'La matrícula es obligatoria'
    if (!form.numero_serie.trim()) return 'El número de serie es obligatorio'
    if (!form.marca)               return 'Selecciona una marca'
    if (!form.modelo)              return 'Selecciona un modelo'
    const anio = Number(form.anio)
    if (isNaN(anio) || anio < ANO_MIN || anio > ANO_MAX)
      return `El año debe estar entre ${ANO_MIN} y ${ANO_MAX}`
    if (!form.fecha_adquisicion)   return 'La fecha de adquisición es obligatoria'
    return null
  }

  // ── Mutación ────────────────────────────────────────────────────────────────

  const { mutate: crear, isPending } = useMutation({
    mutationFn: async () => {
      const err = validar()
      if (err) throw new Error(err)
      if (!estacionId) throw new Error('No tienes estación asignada')

      const id  = crypto.randomUUID()
      const now = new Date().toISOString()

      const vehiculo: Vehiculo = {
        id,
        estacion_id:          estacionId,
        matricula:            form.matricula.trim().toUpperCase(),
        numero_serie:         form.numero_serie.trim().toUpperCase(),
        marca:                form.marca as MarcaVehiculo,
        modelo:               form.modelo,
        anio:                 Number(form.anio),
        kilometraje_actual:   Number(form.kilometraje_actual) || 0,
        horas_motor:          Number(form.horas_motor) || 0,
        estado:               form.estado,
        fecha_adquisicion:    form.fecha_adquisicion,
        programa_mto:         programaMTO!,
        created_at:           now,
      }

      // Guardar local primero
      await db.vehiculos.add(vehiculo)

      // Intentar sync con Supabase
      try {
        const { error: sbErr } = await supabase.from('vehiculos').insert(vehiculo)
        if (sbErr) throw sbErr
      } catch {
        await enqueue({ tabla: 'vehiculos', operacion: 'INSERT', payload: vehiculo })
      }

      return vehiculo
    },
    onSuccess: (vehiculo) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.vehiculos(estacionId!) })
      navigate(`/vehiculos/${vehiculo.id}`)
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validar()
    if (err) { setError(err); return }
    crear()
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-gray-400">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
          </svg>
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Registrar nueva MRE</h1>
          <p className="text-xs text-gray-400 mt-0.5">Máquina para Respuesta a Emergencias</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identificación */}
        <Card>
          <CardHeader title="Identificación" subtitle="Datos únicos del vehículo"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Matrícula *
              </label>
              <input
                type="text"
                value={form.matricula}
                onChange={e => setField('matricula', e.target.value)}
                placeholder="Ej: SEI-BOG-001"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase
                           focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Número de serie *
              </label>
              <input
                type="text"
                value={form.numero_serie}
                onChange={e => setField('numero_serie', e.target.value)}
                placeholder="Ej: 1HTMKAAL4EH123456"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase
                           focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Marca y modelo */}
        <Card>
          <CardHeader title="Especificaciones técnicas" subtitle="Tipo de máquina y programa MTO"/>
          <div className="space-y-3">
            {/* Marca */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.entries(MARCA_CONFIG).map(([valor, cfg]) => (
                  <label
                    key={valor}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      form.marca === valor
                        ? 'border-sei-400 bg-sei-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="marca"
                      value={valor}
                      checked={form.marca === valor}
                      onChange={e => setField('marca', e.target.value)}
                      className="accent-sei-600"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{cfg.label}</p>
                      <p className="text-[10px] text-gray-400">{cfg.programa}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Modelo */}
            {form.marca && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
                <select
                  value={form.modelo}
                  onChange={e => setField('modelo', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sei-400 bg-white"
                >
                  <option value="">Seleccionar modelo...</option>
                  {modelosDisponibles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Programa MTO auto-asignado */}
            {programaMTO && (
              <div className="bg-sei-50 border border-sei-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-sei-600 shrink-0">
                  <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                <p className="text-xs text-sei-700">
                  Programa MTO asignado automáticamente: <strong>{programaMTO}</strong>
                </p>
              </div>
            )}

            {/* Año y fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Año *</label>
                <input
                  type="number"
                  min={ANO_MIN}
                  max={ANO_MAX}
                  value={form.anio}
                  onChange={e => setField('anio', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sei-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha adquisición *
                </label>
                <input
                  type="date"
                  value={form.fecha_adquisicion}
                  onChange={e => setField('fecha_adquisicion', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sei-400"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Estado operativo */}
        <Card>
          <CardHeader title="Estado y horómetro" subtitle="Valores actuales al momento del registro"/>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado inicial</label>
              <select
                value={form.estado}
                onChange={e => setField('estado', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-sei-400 bg-white"
              >
                <option value={EstadoVehiculo.Operativo}>Operativo</option>
                <option value={EstadoVehiculo.EnMantenimiento}>En mantenimiento</option>
                <option value={EstadoVehiculo.FueraDeServicio}>Fuera de servicio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Kilometraje actual (km)
              </label>
              <input
                type="number"
                min="0"
                value={form.kilometraje_actual}
                onChange={e => setField('kilometraje_actual', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-sei-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Horas motor (h)
              </label>
              <input
                type="number"
                min="0"
                value={form.horas_motor}
                onChange={e => setField('horas_motor', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-sei-400"
              />
            </div>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-red-500 shrink-0 mt-0.5">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                       text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold
                       hover:bg-sei-700 disabled:opacity-50 transition-colors
                       flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                </svg>
                Registrando...
              </>
            ) : 'Registrar MRE'}
          </button>
        </div>
      </form>
    </div>
  )
}
