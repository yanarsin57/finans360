import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";
import { createHash } from "node:crypto";

export default defineConfig({
  base: "/finans360/",
  build: { modulePreload: { polyfill: false } },
  plugins: [
    tailwind(),
    {
      name: "offline-shell",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content:
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
            injectTo: "head-prepend",
          },
        ];
      },
      generateBundle(_options, bundle) {
        const files = [
          "./",
          "./index.html",
          "./manifest.webmanifest",
          "./icon-192.png",
          "./icon-512.png",
          ...Object.keys(bundle),
        ];
        const version = createHash("sha256")
          .update(JSON.stringify(bundle))
          .digest("hex")
          .slice(0, 16);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `
const cacheName = 'finans360-${version}';
const files = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)));
});
self.addEventListener('message', event => {
  if (event.data === 'FINANS360_ACTIVATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => {
    const previous = keys.filter(key => key.startsWith('finans360-') && key !== cacheName);
    return Promise.all(previous.slice(0, -1).map(key => caches.delete(key)));
  }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    if (event.request.mode === 'navigate') return await cache.match('./index.html') || fetch(event.request);
    const current = await cache.match(event.request);
    if (current) return current;
    if (new URL(event.request.url).pathname.startsWith(new URL('assets/', self.registration.scope).pathname)) {
      const previous = (await caches.keys()).filter(key => key.startsWith('finans360-') && key !== cacheName).at(-1);
      if (previous) {
        const retained = await (await caches.open(previous)).match(event.request);
        if (retained) return retained;
      }
    }
    return fetch(event.request);
  }));
});
`,
        });
      },
    },
  ],
});
