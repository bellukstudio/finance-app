/// <reference lib="webworker" />
// Directive di atas memberi TypeScript tipe lib.webworker.d.ts (ServiceWorkerGlobalScope dkk)
// khusus untuk file ini, tanpa mengubah "lib" di tsconfig.json yang dipakai seluruh proyek Next.js.
export type {};

import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // FIX: navigation preload + halaman yang di-redirect middleware (/ -> /login?next=%2F) memicu
  // "no-response" di Workbox/Serwist. Dimatikan; kita tidak membutuhkannya untuk app-shell ini.
  navigationPreload: false,
  runtimeCaching: [
    // Data, mutasi, dan alur login: selalu lewat network, jangan pernah dilayani/disimpan di cache.
    // "/" dan "/login" ikut di sini karena keduanya hanya redirect/halaman auth: menyimpan respons
    // redirect (opaqueredirect) atau halaman login lama di cache bisa membuat login macet.
    {
      matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
        sameOrigin && (
          url.pathname === "/" ||
          url.pathname === "/login" ||
          url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/auth/") ||
          url.pathname.startsWith("/undangan")
        ),
      handler: new NetworkOnly(),
    },
    // Sisanya (halaman app-router, aset statis, font) pakai strategi default Serwist
    // (NetworkFirst untuk dokumen, StaleWhileRevalidate untuk aset).
    ...defaultCache,
  ],
});

serwist.addEventListeners();
