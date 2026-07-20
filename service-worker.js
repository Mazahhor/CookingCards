const CACHE = "cooking-steps-v26";
const ASSETS = ["/", "/index.html", "/site.css", "/blog/",
  "/app/", "/app/index.html", "/app/manifest.webmanifest",
  "/app/icons/icon-192.png", "/app/icons/icon-512.png", "/app/icons/icon-180.png",
  "/app/icons/icon-maskable-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// tapping a notification (e.g. the daily tip) focuses the app, or opens it
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) return cs[i].focus(); }
    if (clients.openWindow) return clients.openWindow("/app/");
  }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var req = e.request;
  var url = new URL(req.url);
  // never touch cross-origin traffic (Supabase, Google Fonts) — always network
  if (url.origin !== self.location.origin) return;

  // Pages are NETWORK-FIRST: a deployed update must appear on the next load.
  // Cache is only the offline fallback, per URL, with a shell fallback per area.
  var isPage = req.mode === "navigate" || url.pathname.replace(/\/$/, "").endsWith("/index.html");
  if (isPage) {
    e.respondWith(
      fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (r) {
          if (r) return r;
          var shell = url.pathname.indexOf("/app") === 0 ? "/app/index.html" : "/index.html";
          return caches.match(shell);
        });
      })
    );
    return;
  }

  // Static assets (icons, css, manifest) stay cache-first — small, rarely change.
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (resp) {
      var cp = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(req, cp); });
      return resp;
    });
  }));
});
