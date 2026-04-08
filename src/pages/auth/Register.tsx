import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '@/services/supabase'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const DOMINIO_REQUERIDO = '@aerocivil.gov.co'
const REGIONALES_ORDEN = [
  'Regional Norte', 'Regional Noroccidente', 'Regional Centro Sur',
  'Regional Oriente', 'Regional Nororiente', 'Regional Occidente',
]

interface EstacionOption {
  id: string; nombre: string; codigo_iata: string; aeropuerto: string
  ciudad: string; regional_nombre: string
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
        regional_nombre: (e.regional as any)?.nombre ?? '',
      })) as EstacionOption[]
    },
  })
}

export default function Register() {
  const navigate = useNavigate()
  const { data: estaciones = [], isLoading: loadingEst } = useEstaciones()

  const [paso, setPaso]           = useState<'datos' | 'verificacion'>('datos')
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [estacionId, setEstacionId] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [errorStatus, setErrorStatus] = useState('')

  const emailValido       = email.toLowerCase().endsWith(DOMINIO_REQUERIDO)
  const emailTocado       = email.length > 0
  const passwordOk        = password.length >= 8
  const passwordsIguales  = password === password2
  const formularioValido  = nombre.trim().length >= 3 && emailValido && passwordOk && passwordsIguales && !!estacionId

  const estacionesPorRegional = useMemo(() => {
    const mapa: Record<string, EstacionOption[]> = {}
    for (const reg of REGIONALES_ORDEN) mapa[reg] = []
    for (const e of estaciones) {
      if (!mapa[e.regional_nombre]) mapa[e.regional_nombre] = []
      mapa[e.regional_nombre].push(e)
    }
    return mapa
  }, [estaciones])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formularioValido) return
    setErrorStatus('')
    setLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email:    email.toLowerCase().trim(),
        password,
        options: {
          data: { nombre_completo: nombre.trim(), estacion_id: estacionId, rol: 'bombero' },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (signUpError) throw signUpError
      setPaso('verificacion')
    } catch (e: any) {
      setErrorStatus(e.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (paso === 'verificacion') {
    return (
      <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/5">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#60a5fa" strokeWidth="2" className="animate-pulse">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Protocolo de Verificación Enviado</h2>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-2">{email.toUpperCase()}</p>
        </div>
        <div className="bg-slate-950/50 rounded-2xl p-6 text-left border border-white/5 space-y-4">
          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Siguientes Pasos:</p>
          <ul className="space-y-3">
             <li className="flex gap-3 text-xs text-slate-300 font-mono items-start"><span className="text-blue-500">01</span> ACCEDER A BANDEJA AEROCIVIL</li>
             <li className="flex gap-3 text-xs text-slate-300 font-mono items-start"><span className="text-blue-500">02</span> VALIDAR TOKEN DE SEGURIDAD</li>
             <li className="flex gap-3 text-xs text-slate-300 font-mono items-start"><span className="text-blue-500">03</span> AUTORIZAR ACCESO AL TERMINAL</li>
          </ul>
        </div>
        <Link to="/login" className="block w-full py-4 bg-blue-600 text-white font-bold text-[11px] rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">Finalizar Protocolo</Link>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-6">
      <div>
        <h2 className="text-white font-bold text-lg uppercase tracking-tight">Registro de Nueva Identidad</h2>
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Exclusivo para Personal Operativo SEI</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Nombre Completo Operativo</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="NOMBRE APELLIDO" required
            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"/>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Correo Institucional UAEAC</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={`USUARIO${DOMINIO_REQUERIDO}`} required
            className={cn("w-full bg-slate-950 border rounded-2xl px-5 py-3.5 text-sm text-white font-mono focus:outline-none focus:ring-1 transition-all uppercase", 
            emailTocado && !emailValido ? 'border-red-500/30' : 'border-white/5 focus:ring-blue-500/30')}/>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Estación / Unidad de Servicio</label>
          <select value={estacionId} onChange={e => setEstacionId(e.target.value)} required
            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none">
            <option value="" className="bg-slate-950">SELECT STATION...</option>
            {REGIONALES_ORDEN.map(reg => (
              <optgroup key={reg} label={reg.toUpperCase()} className="bg-slate-950">
                {(estacionesPorRegional[reg] || []).map(e => <option key={e.id} value={e.id}>{e.codigo_iata} — {e.aeropuerto.toUpperCase()}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                   className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Confirmar</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                   className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
          </div>
        </div>

        {errorStatus && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">{errorStatus}</div>}

        <button type="submit" disabled={!formularioValido || loading}
          className="w-full bg-blue-600 text-white font-bold text-[11px] py-4 rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-30 uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 border border-white/10 mt-4">
          {loading ? 'Transmitiendo...' : 'Solicitar Identidad →'}
        </button>
      </form>

      <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest pt-4">
        ¿Identidad ya registrada? <Link to="/login" className="text-blue-400 font-bold hover:underline">Acceder</Link>
      </p>
    </div>
  )
}
