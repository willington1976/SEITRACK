import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { supabase } from '@/services/supabase'

export default function Login() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const { setUsuario, setToken } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { data, error: authError } = await authService.signInWithEmail(email, password)
      if (authError) throw authError
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("*, estacion:estaciones(nombre, codigo_iata, aeropuerto, regional_id)")
        .eq("id", data.user.id)
        .single()
      if (perfilError || !perfil) {
        throw new Error("Tu cuenta está pendiente de activación. Revisa tu correo y confirma tu email primero.")
      }
      if (!perfil.activo) throw new Error("Tu cuenta está desactivada. Contacta al administrador.")
      setToken(data.session.access_token)
      setUsuario(perfil)
      navigate("/")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Invalid login")) setError("Correo o contraseña incorrectos")
      else if (msg.includes("Email not confirmed")) setError("Debes confirmar tu correo antes de ingresar.")
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
      <h2 className="text-white font-semibold text-base mb-5">Iniciar sesión</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-white/70 mb-1">Correo institucional</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="usuario@aerocivil.gov.co" required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"/>
        </div>
        <div>
          <label className="block text-xs text-white/70 mb-1">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"/>
        </div>
        {error && <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 text-xs text-red-200">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-white text-sei-800 font-semibold text-sm py-2.5 rounded-xl hover:bg-sei-50 transition-colors disabled:opacity-50">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <div className="mt-5 pt-4 border-t border-white/10 text-center">
        <p className="text-white/50 text-xs">¿Eres bombero y no tienes cuenta?</p>
        <Link to="/registro" className="mt-1 inline-block text-white/80 text-xs font-medium underline hover:text-white transition-colors">
          Regístrate con tu correo institucional →
        </Link>
      </div>
      <p className="text-center text-[11px] text-white/30 mt-4">SEITrack v0.4 · GSAN-4.1-05-01</p>
    </div>
  )
}
