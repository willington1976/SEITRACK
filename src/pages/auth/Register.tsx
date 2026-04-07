import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '@/services/supabase'
import { useQuery } from '@tanstack/react-query'

const DOMINIO_REQUERIDO = '@aerocivil.gov.co'

// Regionales para agrupar el selector de estaciones
const REGIONALES_ORDEN = [
  'Regional Norte',
  'Regional Noroccidente',
  'Regional Centro Sur',
  'Regional Oriente',
  'Regional Nororiente',
  'Regional Occidente',
]

interface EstacionOption {
  id: string
  nombre: string
  codigo_iata: string
  aeropuerto: string
  ciudad: string
  regional_nombre: string
}

function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones', 'publicas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estaciones')
        .select('id, nombre, codigo_iata, aeropuerto, ciudad, regional:regionales(nombre)')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return (data ?? []).map(e => ({
        id:              e.id,
        nombre:          e.nombre,
        codigo_iata:     e.codigo_iata,
        aeropuerto:      e.aeropuerto,
        ciudad:          e.ciudad,
        regional_nombre: (e.regional as { nombre: string } | null)?.nombre ?? '',
      })) as EstacionOption[]
    },
  })
}

type Paso = 'datos' | 'verificacion'

export default function Register() {
  const navigate = useNavigate()
  const { data: estaciones = [], isLoading: loadingEst } = useEstaciones()

  const [paso, setPaso]           = useState<Paso>('datos')
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [estacionId, setEstacionId] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Validaciones en tiempo real
  const emailValido       = email.toLowerCase().endsWith(DOMINIO_REQUERIDO)
  const emailTocado       = email.length > 0
  const passwordOk        = password.length >= 8
  const passwordsIguales  = password === password2
  const formularioValido  = nombre.trim().length >= 3 && emailValido && passwordOk && passwordsIguales && !!estacionId

  // Agrupar estaciones por regional
  const estacionesPorRegional = useMemo(() => {
    const mapa: Record<string, EstacionOption[]> = {}
    for (const reg of REGIONALES_ORDEN) mapa[reg] = []
    for (const e of estaciones) {
      if (!mapa[e.regional_nombre]) mapa[e.regional_nombre] = []
      mapa[e.regional_nombre].push(e)
    }
    return mapa
  }, [estaciones])

  const estacionSeleccionada = estaciones.find(e => e.id === estacionId)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formularioValido) return
    setError('')
    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email:    email.toLowerCase().trim(),
        password,
        options: {
          data: {
            nombre_completo: nombre.trim(),
            estacion_id:     estacionId,
            rol:             'bombero',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este correo ya está registrado. ¿Olvidaste tu contraseña?')
        } else if (signUpError.message.includes('Signups not allowed')) {
          setError('El auto-registro está desactivado. Contacta al administrador.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      setPaso('verificacion')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de verificación ───────────────────────────────────────────────
  if (paso === 'verificacion') {
    return (
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div>
          <p className="text-white font-semibold text-base">Revisa tu correo institucional</p>
          <p className="text-white/70 text-sm mt-1">
            Enviamos un enlace de confirmación a
          </p>
          <p className="text-white font-mono text-sm mt-1 bg-white/10 rounded-lg px-3 py-1.5 inline-block">
            {email}
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-4 text-left space-y-2">
          <p className="text-white/80 text-xs font-semibold">Próximos pasos:</p>
          {[
            'Abre tu correo de Aerocivil',
            'Haz clic en el enlace de confirmación',
            'Vuelve aquí e inicia sesión',
          ].map((paso, i) => (
            <div key={i} className="flex items-center gap-2 text-white/70 text-xs">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {i + 1}
              </div>
              {paso}
            </div>
          ))}
        </div>

        {estacionSeleccionada && (
          <div className="text-xs text-white/60">
            Tu estación: <span className="text-white font-medium">
              {estacionSeleccionada.codigo_iata} — {estacionSeleccionada.aeropuerto}
            </span>
          </div>
        )}

        <Link
          to="/login"
          className="block w-full py-2.5 bg-white text-sei-800 font-semibold text-sm rounded-xl hover:bg-sei-50 transition-colors text-center"
        >
          Ir al inicio de sesión
        </Link>

        <p className="text-white/40 text-[11px]">
          ¿No llegó el correo? Revisa la carpeta de spam o{' '}
          <button
            onClick={() => setPaso('datos')}
            className="text-white/60 underline"
          >
            intenta de nuevo
          </button>
        </p>
      </div>
    )
  }

  // ── Formulario de registro ─────────────────────────────────────────────────
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl space-y-4">
      <div>
        <h2 className="text-white font-semibold text-base">Registro de bombero</h2>
        <p className="text-white/60 text-xs mt-0.5">
          Solo para personal con correo institucional Aerocivil
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nombre */}
        <div>
          <label className="block text-xs text-white/70 mb-1">Nombre completo *</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Carlos Gómez Pérez"
            required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm
                       placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"
          />
        </div>

        {/* Email con validación de dominio */}
        <div>
          <label className="block text-xs text-white/70 mb-1">
            Correo institucional *
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={`usuario${DOMINIO_REQUERIDO}`}
              required
              className={`w-full bg-white/10 border rounded-xl px-3 py-2.5 text-white text-sm
                         placeholder-white/30 focus:outline-none focus:ring-1 pr-8
                         ${emailTocado && !emailValido
                           ? 'border-red-400/60 focus:ring-red-400/50'
                           : emailTocado && emailValido
                           ? 'border-green-400/60 focus:ring-green-400/50'
                           : 'border-white/20 focus:ring-white/50'}`}
            />
            {emailTocado && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailValido ? (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-green-400">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-red-400">
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                  </svg>
                )}
              </div>
            )}
          </div>
          {emailTocado && !emailValido && (
            <p className="text-red-300 text-[11px] mt-1">
              Debe ser un correo {DOMINIO_REQUERIDO}
            </p>
          )}
        </div>

        {/* Estación */}
        <div>
          <label className="block text-xs text-white/70 mb-1">Tu estación *</label>
          {loadingEst ? (
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white/40 text-sm">
              Cargando estaciones...
            </div>
          ) : (
            <select
              value={estacionId}
              onChange={e => setEstacionId(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-1 focus:ring-white/50
                         [&>option]:bg-sei-800 [&>optgroup]:bg-sei-900 [&>optgroup]:text-white/60"
            >
              <option value="">Selecciona tu aeropuerto...</option>
              {REGIONALES_ORDEN.map(regional => {
                const ests = estacionesPorRegional[regional] ?? []
                if (!ests.length) return null
                return (
                  <optgroup key={regional} label={regional.replace('Regional ', '— ')}>
                    {ests.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.codigo_iata} — {e.aeropuerto}, {e.ciudad}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          )}
        </div>

        {/* Contraseña */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-white/70 mb-1">Contraseña *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              className={`w-full bg-white/10 border rounded-xl px-3 py-2.5 text-white text-sm
                         placeholder-white/30 focus:outline-none focus:ring-1
                         ${password.length > 0 && !passwordOk
                           ? 'border-red-400/60'
                           : 'border-white/20 focus:ring-white/50'}`}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Confirmar *</label>
            <input
              type="password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="Repite la contraseña"
              required
              className={`w-full bg-white/10 border rounded-xl px-3 py-2.5 text-white text-sm
                         placeholder-white/30 focus:outline-none focus:ring-1
                         ${password2.length > 0 && !passwordsIguales
                           ? 'border-red-400/60'
                           : 'border-white/20 focus:ring-white/50'}`}
            />
          </div>
        </div>
        {password2.length > 0 && !passwordsIguales && (
          <p className="text-red-300 text-[11px] -mt-1">Las contraseñas no coinciden</p>
        )}

        {/* Info de rol */}
        <div className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-white/60 shrink-0">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          <p className="text-white/60 text-[11px]">
            Este formulario es exclusivo para <strong className="text-white/80">Bomberos / Maquinistas</strong>.
            Los demás roles son asignados por el administrador del sistema.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!formularioValido || loading}
          className="w-full bg-white text-sei-800 font-semibold text-sm py-2.5 rounded-xl
                     hover:bg-sei-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-xs text-white/50">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-white/80 underline hover:text-white">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
