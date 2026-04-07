// Service Worker — SEITrack Push Handler

self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag:   data.tag || 'seitrack',
      data:  data.data || {},
      requireInteraction: data.requireInteraction ?? false,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const { vehiculo_id, ot_id } = event.notification.data || {}
  const url = event.action === 'ver' && vehiculo_id
    ? `/vehiculos/${vehiculo_id}`
    : event.action === 'abrir' && ot_id
    ? `/mantenimiento/${ot_id}`
    : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const hit = list.find(c => c.url.includes(url))
      return hit ? hit.focus() : clients.openWindow(url)
    })
  )
})
