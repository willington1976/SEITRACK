import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { supabase } from '@/services/supabase'

export default function Login() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [errorStatus, setErrorStatus] = useState("")
  const { setUsuario, setToken } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStatus("")
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
        throw new Error("ACCESO DENEGADO: CUENTA PENDIENTE DE ACTIVACIÓN.")
      }
      if (!perfil.activo) throw new Error("PERMISO REVOCADO: CONTACTE AL ADMINISTRADOR.")
      setToken(data.session.access_token)
      setUsuario(perfil)
      navigate("/")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Invalid login")) setErrorStatus("CREDENCIALES INVÁLIDAS")
      else if (msg.includes("Email not confirmed")) setErrorStatus("CONFIRME EMAIL INSTITUCIONAL")
      else setErrorStatus(msg.toUpperCase())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-8 shadow-2xl border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10">
         <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      </div>

      <div className="mb-8">
        <h2 className="text-white font-bold text-lg tracking-tight uppercase">Autenticación de Terminal</h2>
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">Status: Ready for login</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Credencial de Acceso (Email)</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            placeholder="USUARIO@AEROCIVIL.GOV.CO" 
            required
            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all uppercase"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Código de Seguridad (Password)</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" 
            required
            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-mono placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>

        {errorStatus && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-widest text-center">
            {errorStatus}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold text-[11px] py-4 rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-50 uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 border border-white/10"
        >
          {loading ? "Sincronizando..." : "Iniciar Sesión →"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
        <p className="text-slate-500 text-[10px] uppercase tracking-widest">¿Sin autorización de acceso?</p>
        <Link 
          to="/registro" 
          className="inline-block px-6 py-2 bg-slate-900 border border-white/5 rounded-xl text-blue-400 text-[9px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-blue-300 transition-all"
        >
          Registrar Nueva Unidad de Usuario
        </Link>
      </div>
    </div>
  )
}
