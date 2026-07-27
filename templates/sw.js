// Time Justo — service worker.
// Estratégia network-first para o shell (HTML/JS/CSS): sempre tenta a rede
// primeiro e só cai no cache quando estiver offline, para nunca servir uma
// versão desatualizada dos arquivos. Dados da API nunca passam pelo cache.

const CACHE = "timejusto-{{ app_version }}";
const OFFLINE_URLS = ["/"];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(OFFLINE_URLS).catch(function () {});
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== CACHE; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Só controla GET no mesmo domínio; o resto (analytics, fontes) passa direto.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Dados da API sempre da rede, nunca do cache.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first: rede primeiro, atualiza o cache, cai no cache se offline.
  event.respondWith(
    fetch(request)
      .then(function (response) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        }).catch(function () {});
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/");
          return Response.error();
        });
      })
  );
});
