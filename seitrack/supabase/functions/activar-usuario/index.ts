// ============================================================
// SEITRACK — Edge Function: activar-usuario
// Auth Hook — se ejecuta cuando un usuario confirma su email
// Configurar en: Authentication → Auth Hooks → Hook tipo "Send Email"
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { type, user } = payload

    // Solo procesar confirmación de email de invitación
    if (type !== 'signup' && type !== 'email_change') {
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!user?.id || !user?.email) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar perfil pendiente
    const { data: pendiente } = await admin
      .from('usuarios_pendientes')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!pendiente) {
      console.log(`[activar-usuario] Sin pendiente para ${user.email}`)
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Insertar en tabla usuarios
    const { error: insertErr } = await admin.from('usuarios').insert({
      id:                   user.id,
      estacion_id:          pendiente.estacion_id,
      nombre_completo:      pendiente.nombre_completo,
      email:                pendiente.email,
      telefono:             pendiente.telefono,
      rol:                  pendiente.rol,
      numero_certificado:   pendiente.numero_certificado,
      certificado_vigencia: pendiente.certificado_vigencia,
      activo:               true,
    })

    if (insertErr) {
      console.error(`[activar-usuario] Error: ${insertErr.message}`)
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Limpiar pendiente
    await admin.from('usuarios_pendientes').delete().eq('auth_user_id', user.id)
    console.log(`[activar-usuario] OK: ${user.email} | rol: ${pendiente.rol}`)

    return new Response(JSON.stringify({ ok: true, activado: user.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[activar-usuario] ERROR: ${msg}`)
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
