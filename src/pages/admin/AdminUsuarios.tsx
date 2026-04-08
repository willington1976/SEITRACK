import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { adminService, type CrearUsuarioInput } from '@/services/admin.service'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, initiales, cn } from '@/lib/utils'

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

const ROL_CONFIG: Record<string, { color: string; bg: string }> = {
  jefe_nacional:  { color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  jefe_regional:  { color: 'text-indigo-400',  bg: 'bg-indigo-400/10' },
  jefe_estacion:  { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  bombero:        { color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  odma:           { color: 'text-slate-400',   bg: 'bg-slate-400/10' },
  dsna:           { color: 'text-purple-400',  bg: 'bg-purple-400/10' },
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
        regional_nombre: (e.regional as any)?.[0]?.nombre ?? '',
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
      <div className="glass-panel border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
        
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <svg viewBox="0 0 20 20" width="28" height="28" fill="currentColor" className="text-emerald-500">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-white uppercase tracking-tight">Usuario Autorizado</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">{resultado.nombre}</p>
          </div>
        </div>

        {resultado.password ? (
          <div className="bg-slate-950/50 border border-amber-500/20 rounded-2xl p-5 space-y-3">
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Credencial de acceso temporal</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-xl font-mono font-bold text-white tracking-[.2em]">
                {resultado.password}
              </code>
              <button
                onClick={copiar}
                className="text-[10px] font-bold text-amber-500 border border-amber-500/20 rounded-lg px-3 py-1.5 hover:bg-amber-500/10 transition-all shrink-0"
              >
                {copiado ? 'COPIADO' : 'COPIAR'}
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-snug uppercase font-mono italic">
              Obligatorio: el usuario debe rotar esta clave en el primer inicio de sesión.
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/50 border border-blue-500/20 rounded-2xl p-5">
            <p className="text-[10px] text-blue-400 font-mono uppercase leading-relaxed">
              Dispatch: Se ha enviado un enlace de sincronización a <strong className="text-white">{resultado.email}</strong>.
            </p>
          </div>
        )}

        <button
          onClick={onCerrar}
          className="w-full py-4 bg-slate-900 border border-white/5 text-white rounded-2xl text-[10px] font-bold hover:bg-white/5 transition-all uppercase tracking-widest"
        >
          Confirmar Protocolo
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
    if (!form.nombre_completo.trim()) return setError('EL NOMBRE ES REQUERIDO')
    if (!form.email.includes('@'))    return setError('EMAIL NO VÁLIDO')
    if (!form.estacion_id)            return setError('SELECCIONE ESTACIÓN')
    crear()
  }

  // Agrupar estaciones por regional para el select
  const porRegional: Record<string, EstacionOption[]> = {}
  for (const e of estaciones) {
    if (!porRegional[e.regional_nombre]) porRegional[e.regional_nombre] = []
    porRegional[e.regional_nombre].push(e)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-start justify-center z-[60] p-4 pt-12 overflow-y-auto animate-in slide-in-from-bottom-8 duration-500">
      <div className="glass-panel border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden mb-12">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/50" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[.2em] mb-1">Personnel Induction Protocol</p>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Alta de Nuevo Operativo</h2>
          </div>
          <button
            onClick={onCerrar}
            className="text-slate-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-slate-900 border border-white/5 rounded-xl"
          >
            Cerrar [X]
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Nombre y email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                Nombre Completo del Operativo *
              </label>
              <input
                type="text"
                placeholder="EJ: CARLOS GÓMEZ PÉREZ"
                value={form.nombre_completo}
                onChange={e => set('nombre_completo', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                ID / Correo Institucional *
              </label>
              <input
                type="email"
                placeholder="cgomez@aerocivil.gov.co"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Rol en Sistema *</label>
              <select
                value={form.rol}
                onChange={e => set('rol', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none font-mono"
              >
                {Object.entries(ROL_LABELS).map(([v, l]) => (
                  <option key={v} value={v} className="bg-slate-900">{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                placeholder="+57 300 0000000"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
              />
            </div>
          </div>

          {/* Estación */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Nodo Estación de Servicio *</label>
            <select
              value={form.estacion_id}
              onChange={e => set('estacion_id', e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none font-mono"
            >
              <option value="">SELECCIONAR DESTINO...</option>
              {Object.entries(porRegional).sort().map(([regional, ests]) => (
                <optgroup key={regional} label={regional.toUpperCase()} className="bg-slate-900 text-slate-500">
                  {ests.map(e => (
                    <option key={e.id} value={e.id} className="text-white">
                      {e.codigo_iata} — {e.nombre?.toUpperCase()}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Certificación TME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                N° Certificado Técnico TME
              </label>
              <input
                type="text"
                placeholder="TME-XXXX-XXX"
                value={form.numero_certificado}
                onChange={e => set('numero_certificado', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                Vigencia Legal del Certificado
              </label>
              <input
                type="date"
                value={form.certificado_vigencia || ''}
                onChange={e => set('certificado_vigencia', e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
              />
            </div>
          </div>

          {/* Modo de acceso */}
          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               Method of Activation
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  val: false,
                  titulo:  'CLAVE MANUAL',
                  desc:    'EL SISTEMA GENERA UNA CLAVE PARA COMUNICACIÓN DIRECTA.',
                },
                {
                  val: true,
                  titulo:  'INVITAR POR EMAIL',
                  desc:    'SUPABASE ENVÍA UN ENLACE DE CONFIGURACIÓN AL USUARIO.',
                },
              ].map(op => (
                <label
                  key={String(op.val)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    form.enviar_email === op.val
                      ? "border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5"
                      : "border-white/5 bg-slate-900/50 grayscale hover:grayscale-0 hover:bg-slate-900"
                  )}
                >
                  <input
                    type="radio"
                    name="modo_acceso"
                    checked={form.enviar_email === op.val}
                    onChange={() => set('enviar_email', op.val)}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">{op.titulo}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1 uppercase leading-snug">{op.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-4 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest"
            >
              Desestimar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold font-mono tracking-widest
                         hover:bg-blue-500 shadow-xl shadow-blue-600/20 border border-white/10 disabled:opacity-50 transition-all"
            >
              {isPending ? 'SYNCHRONIZING...' : 'AUTORIZAR INGRESO →'}
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
    if (dias === null) return 'text-slate-700'
    if (dias <= 0)    return 'text-red-500 font-bold'
    if (dias <= 30)   return 'text-amber-500'
    return 'text-emerald-500'
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1 h-3 bg-blue-600 rounded-full" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Security & HR Protocol</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Gestión de Roles y Usuarios</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[.25em] mt-1 italic">
             {usuarios?.length ?? 0} NODOS DE IDENTIDAD REGISTRADOS EN LA RED
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="px-6 py-3 bg-blue-600 text-white text-[11px] font-bold rounded-2xl
                     hover:bg-blue-500 transition-all uppercase tracking-widest shadow-xl shadow-blue-600/20 border border-white/10"
        >
          Alta de Nuevo Usuario +
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[280px] relative">
          <input
            type="search"
            placeholder="FILTRAR POR NOMBRE, EMAIL O CÓDIGO IATA..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white uppercase placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
          />
        </div>
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
          className="bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono appearance-none min-w-[180px]"
        >
          <option value="todos">VER TODOS LOS ROLES</option>
          {Object.entries(ROL_LABELS).map(([v, l]) => (
            <option key={v} value={v} className="bg-slate-900">{l.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="glass-panel border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizando Base de Datos...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    {['OPERATIVO','ROL ASIGNADO','ESTACIÓN','CERTIFICADO','STATUS','MANDO'].map(h => (
                      <th key={h} className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtrados?.map(u => {
                    const rc = ROL_CONFIG[u.rol] || ROL_CONFIG.bombero
                    return (
                      <tr
                        key={u.id}
                        className={cn("hover:bg-white/5 transition-all group", !u.activo && "opacity-40 grayscale")}
                      >
                        {/* Usuario */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center
                                            text-blue-500 text-xs font-bold shrink-0 shadow-inner group-hover:border-blue-500/30 transition-colors">
                              {initiales(u.nombre_completo)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-100 uppercase tracking-tight truncate max-w-[180px] group-hover:text-blue-400 transition-colors">{u.nombre_completo}</p>
                              <p className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Rol — editable inline */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={u.rol}
                            onChange={e => cambiarRol({ id: u.id, rol: e.target.value })}
                            className={cn(
                              "text-[9px] font-bold border-none rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/30 bg-transparent cursor-pointer uppercase tracking-tighter",
                              rc.color, rc.bg
                            )}
                          >
                            {Object.entries(ROL_LABELS).map(([v, l]) => (
                              <option key={v} value={v} className="bg-slate-900 text-white">{l.toUpperCase()}</option>
                            ))}
                          </select>
                        </td>

                        {/* Estación */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-white/5 text-[9px] tracking-widest">
                              {u.estacion_iata || 'N/A'}
                            </span>
                            <span className="text-slate-500 uppercase font-bold tracking-tighter truncate max-w-[120px]">{u.estacion_nombre}</span>
                          </div>
                          <p className="text-[9px] text-slate-600 font-mono italic mt-1 uppercase">REG: {u.regional_nombre?.replace('Regional ', '')}</p>
                        </td>

                        {/* Certificado */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.certificado_vigencia ? (
                            <div>
                              <p className="text-slate-600 font-mono text-[9px]">{formatDate(u.certificado_vigencia)}</p>
                              <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", certColor(u.cert_dias_restantes))}>
                                {u.cert_dias_restantes === null ? '—'
                                  : u.cert_dias_restantes <= 0 ? 'LICENCIA VENCIDA'
                                  : `${u.cert_dias_restantes} DÍAS VIGENTE`}
                              </p>
                            </div>
                          ) : <span className="text-slate-800 font-bold uppercase tracking-widest text-[8px]">SIN REGISTRO TME</span>}
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4 whitespace-nowrap">
                           <Badge variant={u.activo ? 'success' : 'muted'} className={cn("px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-widest", u.activo ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-slate-900 text-slate-600 border-none")}>
                             {u.activo ? 'ACTIVO' : 'DE BAJA'}
                           </Badge>
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActivo({ id: u.id, activo: !u.activo })}
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-[.25em] transition-all px-3 py-1.5 rounded-lg border",
                              u.activo
                                ? "text-red-500 border-red-500/10 bg-red-500/5 hover:bg-red-500 hover:text-white"
                                : "text-emerald-500 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white"
                            )}
                          >
                            {u.activo ? 'De-Auth' : 'Unlock'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!filtrados?.length && (
              <div className="text-center py-20 bg-slate-950/20">
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[.3em]">Cero coincidencias detectadas en este parámetro</p>
              </div>
            )}

            {/* Footer con conteo */}
            {!!filtrados?.length && (
              <div className="px-6 py-3 border-t border-white/5 bg-white/5 text-[9px] font-mono text-slate-600 font-bold uppercase tracking-widest">
                {filtrados.length} IDENTIDADES ACTIVAS EN LISTADO // TOTAL {usuarios?.length}
              </div>
            )}
          </>
        )}
      </div>

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
