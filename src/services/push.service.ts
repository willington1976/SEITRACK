import { supabase } from './supabase'

// VAPID public key — generar con: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

export const pushService = {
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  },

  async requestPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission()
  },

  async subscribe(usuarioId: string): Promise<boolean> {
    if (!this.isSupported()) return false
    const perm = await this.requestPermission()
    if (perm !== 'granted') return false

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string; keys: { p256dh: string; auth: string }
      }

      const { error } = await supabase.from('push_subscriptions').upsert({
        usuario_id: usuarioId,
        endpoint,
        p256dh:     keys.p256dh,
        auth_key:   keys.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' })

      return !error
    } catch (e) {
      console.error('Push subscribe error:', e)
      return false
    }
  },

  async unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  },

  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData  = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  },

  // Mostrar notificación local (sin servidor)
  async showLocal(title: string, body: string, data?: Record<string, unknown>) {
    if (Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data,
      requireInteraction: false,
    })
  }
}
