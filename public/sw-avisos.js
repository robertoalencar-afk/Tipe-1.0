// Service worker só dos avisos da equipe: mostra o aviso e abre a tela certa ao tocar.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "TIPE", {
    body: d.body || "",
    tag: d.tag,
    renotify: !!d.tag,
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.startsWith(url) && "focus" in c) return c.focus();
    }
    return self.clients.openWindow(url);
  })());
});
