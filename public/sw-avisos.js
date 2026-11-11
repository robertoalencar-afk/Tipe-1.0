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

// Sem internet: navegações caem numa página da marca guardada na instalação.
// Só navegações (HTML); APIs, pagamentos e arquivos seguem direto para a rede, sem cache.
const OFFLINE = "tipe-offline-v1";
const OFFLINE_ARQUIVOS = ["/offline.html", "/marca/tipe-logo.svg", "/marca/lebre-esperando.webp"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE).then((c) => c.addAll(OFFLINE_ARQUIVOS)).catch(() => undefined));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("tipe-offline-") && k !== OFFLINE).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && OFFLINE_ARQUIVOS.slice(1).includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  if (req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(async () => (await caches.match("/offline.html")) || Response.error()));
});
