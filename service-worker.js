const CACHE = "cooking-cards-v6";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var req = e.request;
  var url = new URL(req.url);
  // never touch cross-origin traffic (Supabase API calls must always hit the network)
  if (url.origin !== self.location.origin) return;

  // The app shell is NETWORK-FIRST: a deployed update must appear on the next load,
  // not after a manual cache purge. Cache is only the offline fallback.
  var isShell = req.mode === "navigate" || url.pathname.replace(/\/$/, "").endsWith("/index.html");
  if (isShell) {
    e.respondWith(
      fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", cp); });
        return resp;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }

  // Static assets (icons, manifest) stay cache-first — they're small and rarely change.
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (resp) {
      var cp = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(req, cp); });
      return resp;
    });
  }));
});
