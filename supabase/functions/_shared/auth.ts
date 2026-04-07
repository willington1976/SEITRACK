import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function validarJefeNacional(authHeader: string | null): Promise<{
  ok: boolean
  error?: string
  userId?: string
}> {
  if (!authHeader) return { ok: false, error: 'Sin autorización' }

  const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // CAUSA 1 del 401: usábamos anon key para getUser() y para leer la tabla
  // usuarios. El anon key con RLS activa no puede leer otras filas.
  // Solución: usar service role key — tiene acceso total y puede verificar
  // el JWT igual que el anon key.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const token = authHeader.replace('Bearer ', '')

  // Verificar el JWT del usuario que llama
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) {
    console.error('[auth] getUser error:', error?.message)
    return { ok: false, error: 'Token inválido o expirado' }
  }

  // Leer el perfil con service role — RLS no aplica
  const { data: perfil, error: perfilErr } = await adminClient
    .from('usuarios')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  if (perfilErr) {
    console.error('[auth] perfil error:', perfilErr.message)
    return { ok: false, error: 'No se encontró perfil de usuario en el sistema' }
  }

  if (!perfil?.activo)                return { ok: false, error: 'Usuario inactivo' }
  if (perfil.rol !== 'jefe_nacional') return { ok: false, error: 'Sin permisos — se requiere rol jefe_nacional' }

  return { ok: true, userId: user.id }
}
