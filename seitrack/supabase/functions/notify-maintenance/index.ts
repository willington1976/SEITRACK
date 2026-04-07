// Supabase Edge Function — SEITRACK
// Envía Web Push a usuarios con notificaciones pendientes
// Deploy: supabase functions deploy notify-maintenance --schedule "*/5 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL') ?? 'sei@aerocivil.gov.co'

Deno.serve(async () => {
  // Obtener notificaciones no enviadas
  const { data: pendientes, error } = await supabase
    .from('notificaciones_log')
    .select('*, subs:push_subscriptions!inner(endpoint, p256dh, auth_key)')
    .eq('enviado', false)
    .order('created_at')
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let enviadas = 0
  let fallidas = 0

  for (const notif of pendientes ?? []) {
    for (const sub of notif.subs ?? []) {
      try {
        const payload = JSON.stringify({
          title: notif.titulo,
          body:  notif.cuerpo,
          data:  notif.datos,
          icon:  '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag:   notif.tipo,
          requireInteraction: notif.tipo === 'inspeccion_rechazada',
        })

        // Web Push usando la API de Deno
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
        })

        if (response.ok) {
          enviadas++
        } else {
          fallidas++
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`)
        }
      } catch (e) {
        fallidas++
        console.error('Push error:', e)
      }
    }

    // Marcar como enviada
    await supabase
      .from('notificaciones_log')
      .update({ enviado: true })
      .eq('id', notif.id)
  }

  return new Response(
    JSON.stringify({ enviadas, fallidas, total: pendientes?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
