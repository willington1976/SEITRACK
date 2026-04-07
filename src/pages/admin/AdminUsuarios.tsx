import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { adminService, type CrearUsuarioInput } from '@/services/admin.service'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, initiales } from '@/lib/utils'
import { Rol } from '@/core/enums'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UsuarioRow {
  id: string; nombre_completo: string; email: string; rol: string
  estacion_nombre: string; estacion_iata: string; regional_nombre: string
  activo: boolean; certificado_vigencia: string | null
  cert_dias_restantes: number | null; created_at: string
}

interface EstacionOption { id: string; nombre: string; codigo_iata: string; regional_nombre: string }

// ─── Constantes visuales ──────────────────────────────────────────────────────

const ROL_LABELS: Record<string, string> = {
  jefe_nacional:  'Jefe Nacional',
  jefe_regional:  'Jefe Regional',
  jefe_estacion:  'Jefe de Estación',
  bombero:        'Bombero',
  odma:           'ODMA',
  dsna:           'DSNA',
}

const ROL_BADGE: Record<string, 'default'|'success'|'warning'|'info'|'muted'> = {
  jefe_nacional:  'warning',
  jefe_regional:  'info',
  jefe_estacion:  'success',
  bombero:        'default',
  odma:           'muted',
  dsna:           'info',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAdminUsuarios() {
  return useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_usuarios')
      if (error) throw error
      return (data ?? []) as UsuarioRow[]
    },
  })
}

function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estaciones')
        .select('id, nombre, codigo_iata, regional:regionales(nombre)')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return (data ?? []).map(e => ({
        id:              e.id,
        nombre:          e.nombre,
        codigo_iata:     e.codigo_iata,
        regional_nombre: (e.regional as { nombre: string } | null)?.nombre ?? '',
      })) as EstacionOption[]
    },
  })
}

// ─── Componente: Modal resultado creación ────────────────────────────────────

function ModalResultado({ resultado, onCerrar }: {
  resultado: { nombre: string; email: string; password?: string; nota?: string }
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    if (!resultado.password) return
    navigator.clipboard.writeText(resultado.password)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        {/* Ícono éxito */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 20 20" width="24" height="24" fill="currentColor" className="text-green-600">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">Usuario creado exitosamente</p>
          <p className="text-xs text-gray-500">{resultado.nombre}</p>
          <p className="text-xs text-gray-400">{resultado.email}</p>
        </div>

        {/* Contraseña temporal */}
        {resultado.password ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              Contraseña temporal — comunícala de forma segura
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-base font-mono font-bold text-amber-900 tracking-widest">
                {resultado.password}
              </code>
              <button
                onClick={copiar}
                className="text-xs text-amber-700 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors shrink-0"
              >
                {copiado ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-[11px] text-amber-600 leading-snug">
              El usuario deberá cambiar esta contraseña en su primer acceso.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-800">
              Se envió un correo de invitación a <strong>{resultado.email}</strong>.
              El usuario recibirá un enlace para establecer su contraseña.
            </p>
          </div>
        )}

        <button
          onClick={onCerrar}
          className="w-full py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold hover:bg-sei-700 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

// ─── Componente: Formulario nuevo usuario ────────────────────────────────────

const FORM_VACIO: CrearUsuarioInput = {
  nombre_completo:      '',
  email:                '',
  rol:                  'bombero',
  estacion_id:          '',
  telefono:             '',
  numero_certificado:   '',
  certificado_vigencia: '',
  enviar_email:         false,
}

function FormNuevoUsuario({
  estaciones,
  onCerrar,
  onExito,
}: {
  estaciones: EstacionOption[]
  onCerrar:   () => void
  onExito:    (resultado: { nombre: string; email: string; password?: string }) => void
}) {
  const [form, setForm]   = useState<CrearUsuarioInput>(FORM_VACIO)
  const [error, setError] = useState('')

  const { mutate: crear, isPending } = useMutation({
    mutationFn: () => adminService.crearUsuario(form),
    onSuccess: (resultado) => {
      if (!resultado.ok) {
        setError(resultado.error ?? 'Error desconocido')
        return
      }
      onExito({
        nombre:   resultado.usuario!.nombre_completo,
        email:    resultado.usuario!.email,
        password: resultado.password_temporal,
      })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Error de red'),
  })

  function set(k: keyof CrearUsuarioInput, v: string | boolean) {
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_completo.trim()) return setError('El nombre es requerido')
    if (!form.email.includes('@'))    return setError('Email inválido')
    if (!form.estacion_id)            return setError('Selecciona una estación')
    crear()
  }

  // Agrupar estaciones por regional para el select
  const porRegional: Record<string, EstacionOption[]> = {}
  for (const e of estaciones) {
    if (!porRegional[e.regional_nombre]) porRegional[e.regional_nombre] = []
    porRegional[e.regional_nombre].push(e)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">Nuevo usuario</p>
            <p className="text-xs text-gray-400 mt-0.5">Todos los campos marcados con * son obligatorios</p>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-gray-400">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre y email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                placeholder="Carlos Gómez Pérez"
                value={form.nombre_completo}
                onChange={e => set('nombre_completo', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Correo institucional *
              </label>
              <input
                type="email"
                placeholder="cgomez@aerocivil.gov.co"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Rol y teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={e => set('rol', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 bg-white"
              >
                {Object.entries(ROL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                placeholder="+57 300 0000000"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Estación */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estación *</label>
            <select
              value={form.estacion_id}
              onChange={e => set('estacion_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 bg-white"
            >
              <option value="">Seleccionar estación...</option>
              {Object.entries(porRegional).sort().map(([regional, ests]) => (
                <optgroup key={regional} label={regional}>
                  {ests.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.codigo_iata} — {e.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Certificación TME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                N° Certificado TME
              </label>
              <input
                type="text"
                placeholder="TME-2024-001"
                value={form.numero_certificado}
                onChange={e => set('numero_certificado', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vigencia del certificado
              </label>
              <input
                type="date"
                value={form.certificado_vigencia}
                onChange={e => set('certificado_vigencia', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sei-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Modo de acceso */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700">Modo de acceso inicial</p>
            <div className="space-y-2">
              {[
                {
                  val: false,
                  titulo:  'Contraseña temporal',
                  desc:    'El sistema genera una contraseña. Tú se la comunicas al usuario.',
                },
                {
                  val: true,
                  titulo:  'Email de invitación',
                  desc:    'Supabase envía un correo con enlace para que el usuario establezca su contraseña.',
                },
              ].map(op => (
                <label
                  key={String(op.val)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.enviar_email === op.val
                      ? 'border-sei-400 bg-sei-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_acceso"
                    checked={form.enviar_email === op.val}
                    onChange={() => set('enviar_email', op.val)}
                    className="mt-0.5 accent-sei-600"
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{op.titulo}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{op.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-red-500 shrink-0 mt-0.5">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-sei-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-sei-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                  </svg>
                  Creando usuario...
                </>
              ) : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AdminUsuarios() {
  const { data: usuarios, isLoading } = useAdminUsuarios()
  const { data: estaciones = [] }     = useEstaciones()
  const qc = useQueryClient()

  const [busqueda,    setBusqueda]    = useState('')
  const [filtroRol,   setFiltroRol]   = useState('todos')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [resultado,   setResultado]   = useState<{
    nombre: string; email: string; password?: string
  } | null>(null)

  // Mutaciones inline para toggle activo y cambio de rol
  const { mutate: toggleActivo } = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      adminService[activo ? 'activarUsuario' : 'desactivarUsuario'](id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  })

  const { mutate: cambiarRol } = useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: string }) =>
      adminService.cambiarRol(id, rol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  })

  const filtrados = usuarios?.filter(u => {
    const matchBusq = !busqueda ||
      u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.estacion_iata?.toLowerCase().includes(busqueda.toLowerCase())
    const matchRol = filtroRol === 'todos' || u.rol === filtroRol
    return matchBusq && matchRol
  })

  function certColor(dias: number | null) {
    if (dias === null) return 'text-gray-300'
    if (dias <= 0)    return 'text-red-600 font-semibold'
    if (dias <= 30)   return 'text-red-500'
    if (dias <= 60)   return 'text-amber-500'
    return 'text-green-600'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Gestión de usuarios</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {usuarios?.length ?? 0} usuarios registrados
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="px-4 py-2 bg-sei-600 text-white text-xs font-semibold rounded-xl
                     hover:bg-sei-700 transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Buscar nombre, email, IATA..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-48 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-1 focus:ring-sei-400"
        />
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-1 focus:ring-sei-400"
        >
          <option value="todos">Todos los roles</option>
          {Object.entries(ROL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Usuario','Rol','Estación','Certificado','Estado','Acciones'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados?.map(u => (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50/60 transition-colors ${!u.activo ? 'opacity-50' : ''}`}
                    >
                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sei-100 flex items-center justify-center
                                          text-sei-700 text-xs font-semibold shrink-0">
                            {initiales(u.nombre_completo)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-36">{u.nombre_completo}</p>
                            <p className="text-gray-400 truncate max-w-36">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rol — editable inline */}
                      <td className="px-4 py-3">
                        <select
                          value={u.rol}
                          onChange={e => cambiarRol({ id: u.id, rol: e.target.value })}
                          className="text-xs border border-transparent rounded-lg px-1.5 py-1
                                     hover:border-gray-200 focus:outline-none focus:ring-1 focus:ring-sei-400
                                     bg-transparent cursor-pointer"
                        >
                          {Object.entries(ROL_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>

                      {/* Estación */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.estacion_iata && (
                            <span className="font-mono font-semibold text-gray-700 bg-gray-100
                                             px-1.5 py-0.5 rounded text-[10px]">
                              {u.estacion_iata}
                            </span>
                          )}
                          <span className="text-gray-500 truncate max-w-24">{u.estacion_nombre}</span>
                        </div>
                        <p className="text-gray-400 mt-0.5">{u.regional_nombre?.replace('Regional ', '')}</p>
                      </td>

                      {/* Certificado */}
                      <td className="px-4 py-3">
                        {u.certificado_vigencia ? (
                          <div>
                            <p className="text-gray-600">{formatDate(u.certificado_vigencia)}</p>
                            <p className={certColor(u.cert_dias_restantes)}>
                              {u.cert_dias_restantes === null ? '—'
                                : u.cert_dias_restantes <= 0 ? 'VENCIDO'
                                : `${u.cert_dias_restantes}d`}
                            </p>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <Badge variant={u.activo ? 'success' : 'muted'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActivo({ id: u.id, activo: !u.activo })}
                          className={`text-xs font-medium hover:underline transition-colors ${
                            u.activo
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!filtrados?.length && (
              <p className="text-sm text-gray-400 text-center py-8">Sin resultados</p>
            )}

            {/* Footer con conteo */}
            {!!filtrados?.length && (
              <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                {filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''}
                {filtrados.length !== usuarios?.length && ` de ${usuarios?.length} total`}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal: formulario nuevo usuario */}
      {mostrarForm && (
        <FormNuevoUsuario
          estaciones={estaciones}
          onCerrar={() => setMostrarForm(false)}
          onExito={(res) => {
            setMostrarForm(false)
            setResultado(res)
            qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] })
          }}
        />
      )}

      {/* Modal: resultado de creación */}
      {resultado && (
        <ModalResultado
          resultado={resultado}
          onCerrar={() => setResultado(null)}
        />
      )}
    </div>
  )
}
