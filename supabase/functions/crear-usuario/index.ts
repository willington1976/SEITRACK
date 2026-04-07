// ============================================================
// SEITRACK — Edge Function: crear-usuario v2
// Flujo correcto para invite vs contraseña temporal
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validarJefeNacional } from '../_shared/auth.ts'

interface CrearUsuarioPayload {
  nombre_completo:       string
  email:                 string
  rol:                   string
  estacion_id:           string
  telefono?:             string
  numero_certificado?:   string
  certificado_vigencia?: string
  enviar_email:          boolean
}

const ROLES_VALIDOS = [
  'jefe_nacional','jefe_regional','jefe_estacion','bombero','odma','dsna'
]

function validarPayload(body: unknown): { ok: boolean; error?: string; data?: CrearUsuarioPayload } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' }
  const b = body as Record<string, unknown>
  if (!b.nombre_completo || typeof b.nombre_completo !== 'string' || b.nombre_completo.trim().length < 3)
    return { ok: false, error: 'nombre_completo requerido (mín. 3 caracteres)' }
  if (!b.email || typeof b.email !== 'string' || !b.email.includes('@'))
    return { ok: false, error: 'email inválido' }
  if (!b.rol || !ROLES_VALIDOS.includes(b.rol as string))
    return { ok: false, error: `rol inválido. Valores: ${ROLES_VALIDOS.join(', ')}` }
  if (!b.estacion_id || typeof b.estacion_id !== 'string')
    return { ok: false, error: 'estacion_id requerido' }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(b.estacion_id as string))
    return { ok: false, error: 'estacion_id no es UUID válido' }
  return {
    ok: true,
    data: {
      nombre_completo:      (b.nombre_completo as string).trim(),
      email:                (b.email as string).toLowerCase().trim(),
      rol:                  b.rol as string,
      estacion_id:          b.estacion_id as string,
      telefono:             b.telefono as string | undefined,
      numero_certificado:   b.numero_certificado as string | undefined,
      certificado_vigencia: b.certificado_vigencia as string | undefined,
      enviar_email:         b.enviar_email === true,
    }
  }
}

function generarPassword(): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const parte1 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const parte2 = Array.from({ length: 4 }, () => '0123456789'[Math.floor(Math.random() * 10)]).join('')
  return `SEI-${parte1}-${parte2}`
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método no permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    // ── 1. Verificar que el caller es jefe_nacional ────────────────────────────
    const authCheck = await validarJefeNacional(req.headers.get('Authorization'))
    if (!authCheck.ok) {
      return new Response(JSON.stringify({ ok: false, error: authCheck.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 2. Validar payload ─────────────────────────────────────────────────────
    let body: unknown
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }

    const val = validarPayload(body)
    if (!val.ok || !val.data) {
      return new Response(JSON.stringify({ ok: false, error: val.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = val.data

    // ── 3. Cliente admin ───────────────────────────────────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 4. Verificar estación ──────────────────────────────────────────────────
    const { data: estacion, error: estErr } = await admin
      .from('estaciones').select('id, nombre, codigo_iata')
      .eq('id', payload.estacion_id).single()
    if (estErr || !estacion) {
      return new Response(JSON.stringify({ ok: false, error: 'Estación no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 5. Verificar email duplicado en tabla usuarios ─────────────────────────
    const { data: existente } = await admin
      .from('usuarios').select('id').eq('email', payload.email).maybeSingle()
    if (existente) {
      return new Response(
        JSON.stringify({ ok: false, error: `El email ${payload.email} ya está registrado en el sistema` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 6. Crear en Auth + perfil según modo ──────────────────────────────────
    let authUserId: string
    let passwordTemporal: string | undefined

    if (payload.enviar_email) {
      // ── MODO INVITE: email con enlace ────────────────────────────────────────
      const { data, error } = await admin.auth.admin.inviteUserByEmail(payload.email, {
        data: { nombre_completo: payload.nombre_completo, rol: payload.rol },
        redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://seitrack.vercel.app'}/login`,
      })
      if (error) throw new Error(`Invite error: ${error.message}`)
      authUserId = data.user.id

      // Guardar perfil en tabla pendientes — se moverá a usuarios cuando confirme
      const { error: pendErr } = await admin.rpc('crear_perfil_pendiente', {
        p_auth_user_id:        authUserId,
        p_nombre_completo:     payload.nombre_completo,
        p_email:               payload.email,
        p_rol:                 payload.rol,
        p_estacion_id:         payload.estacion_id,
        p_telefono:            payload.telefono ?? null,
        p_numero_certificado:  payload.numero_certificado ?? null,
        p_certificado_vigencia: payload.certificado_vigencia ?? null,
      })
      if (pendErr) {
        console.error('[crear-usuario] Error guardando pendiente:', pendErr.message)
        // No hacemos rollback — el usuario quedó en Auth, se puede reintentar
      }

    } else {
      // ── MODO PASSWORD TEMPORAL: acceso inmediato ─────────────────────────────
      passwordTemporal = generarPassword()
      const { data, error } = await admin.auth.admin.createUser({
        email:         payload.email,
        password:      passwordTemporal,
        email_confirm: true,   // confirmar automáticamente, no necesita clic
        user_metadata: { nombre_completo: payload.nombre_completo, rol: payload.rol },
      })
      if (error) throw new Error(`Create user error: ${error.message}`)
      authUserId = data.user.id

      // Insertar perfil directamente en usuarios (email ya confirmado)
      const { error: perfilErr } = await admin.rpc('insertar_usuario_confirmado', {
        p_auth_user_id:        authUserId,
        p_nombre_completo:     payload.nombre_completo,
        p_email:               payload.email,
        p_rol:                 payload.rol,
        p_estacion_id:         payload.estacion_id,
        p_telefono:            payload.telefono ?? null,
        p_numero_certificado:  payload.numero_certificado ?? null,
        p_certificado_vigencia: payload.certificado_vigencia ?? null,
      })
      if (perfilErr) {
        // Rollback: eliminar de Auth si el perfil falló
        await admin.auth.admin.deleteUser(authUserId)
        throw new Error(`Error creando perfil: ${perfilErr.message}`)
      }
    }

    // ── 7. Audit log ───────────────────────────────────────────────────────────
    await admin.from('audit_log').insert({
      tabla: 'usuarios', operacion: 'INSERT',
      registro_id: authUserId, usuario_id: authCheck.userId,
      datos_despues: {
        email:        payload.email,
        rol:          payload.rol,
        estacion:     estacion.codigo_iata,
        modo:         payload.enviar_email ? 'invite' : 'password_temporal',
      },
    })

    console.log(`[crear-usuario] OK: ${payload.email} | ${estacion.codigo_iata} | ${payload.enviar_email ? 'invite' : 'temp_pass'}`)

    // ── 8. Respuesta ───────────────────────────────────────────────────────────
    const respuesta: Record<string, unknown> = {
      ok: true,
      usuario: { id: authUserId, email: payload.email, nombre_completo: payload.nombre_completo, rol: payload.rol },
    }
    if (passwordTemporal) {
      respuesta.password_temporal = passwordTemporal
      respuesta.nota = 'Comunica esta contraseña al usuario de forma segura. Deberá cambiarla en su primer acceso.'
    } else {
      respuesta.nota = `Se envió invitación a ${payload.email}. El perfil se activará cuando el usuario confirme su correo.`
    }

    return new Response(JSON.stringify(respuesta),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[crear-usuario] ERROR: ${msg}`)
    return new Response(JSON.stringify({ ok: false, error: 'Error interno', detalle: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
