// ─── Servicio de administración — llama a las Edge Functions ─────────────────
import { supabase } from './supabase'

export interface CrearUsuarioInput {
  nombre_completo:       string
  email:                 string
  rol:                   string
  estacion_id:           string
  telefono?:             string
  numero_certificado?:   string
  certificado_vigencia?: string
  enviar_email:          boolean
}

export interface CrearUsuarioResult {
  ok:      boolean
  usuario?: {
    id:             string
    email:          string
    nombre_completo:string
    rol:            string
  }
  password_temporal?: string
  nota?:             string
  error?:            string
  detalle?:          string
}

export const adminService = {
  async crearUsuario(input: CrearUsuarioInput): Promise<CrearUsuarioResult> {
    // Refrescar sesión para garantizar que el access_token no esté caducado
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError || !session) {
      // Si no se puede refrescar, intentar con la sesión actual
      const { data: { session: current } } = await supabase.auth.getSession()
      if (!current) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }
    }

    const token      = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const url         = `${supabaseUrl}/functions/v1/crear-usuario`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify(input),
      })
    } catch (networkErr) {
      return { ok: false, error: 'Error de red. Verifica tu conexión.' }
    }

    if (!response.ok && response.status !== 201) {
      // Intentar leer el cuerpo del error de todas formas
      try {
        const errData = await response.json()
        return { ok: false, error: errData.error ?? `Error ${response.status}`, detalle: errData.detalle }
      } catch {
        return { ok: false, error: `Error del servidor: ${response.status} ${response.statusText}` }
      }
    }

    const data = await response.json()
    return data as CrearUsuarioResult
  },

  async desactivarUsuario(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: false })
      .eq('id', id)
    return error ? { ok: false, error: error.message } : { ok: true }
  },

  async activarUsuario(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: true })
      .eq('id', id)
    return error ? { ok: false, error: error.message } : { ok: true }
  },

  async cambiarRol(id: string, rol: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('usuarios')
      .update({ rol })
      .eq('id', id)
    return error ? { ok: false, error: error.message } : { ok: true }
  },

  async cambiarEstacion(id: string, estacion_id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('usuarios')
      .update({ estacion_id })
      .eq('id', id)
    return error ? { ok: false, error: error.message } : { ok: true }
  },
}
