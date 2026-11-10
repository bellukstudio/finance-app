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
  navigationPreload: true,
  runtimeCaching: [
    // Data & mutasi: API routes, callback auth, cron — selalu lewat network, jangan pernah
    // dilayani dari cache (saldo/transaksi harus selalu yang terbaru, bukan data lama).
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },
    // Sisanya (halaman app-router, aset statis, font) pakai strategi default Serwist
    // (NetworkFirst untuk dokumen, StaleWhileRevalidate untuk aset) — cukup untuk app-shell
    // offline tanpa membuat data keuangan terasa basi.
    ...defaultCache,
  ],
});

serwist.addEventListeners();