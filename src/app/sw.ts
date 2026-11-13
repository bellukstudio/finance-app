/// <reference lib="webworker" />
// Directive di atas memberi TypeScript tipe lib.webworker.d.ts (ServiceWorkerGlobalScope dkk)
// khusus untuk file ini, tanpa mengubah "lib" di tsconfig.json yang dipakai seluruh proyek Next.js.
export type {};

import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // WAJIB ada: @serwist/next mengganti `self.__SW_MANIFEST` saat build. Tanpa ini build gagal
    // dengan "Can't find self.__SW_MANIFEST in your SW source".
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Halaman & data RSC berisi data keuangan: selalu dari jaringan, TIDAK pernah disimpan di cache
// (mencegah data tersisa di perangkat bersama setelah logout). Saat offline tampilkan halaman sederhana.
const networkOrOffline = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
       <body style="font-family:system-ui;padding:2rem;text-align:center">
       <h1>Tidak bisa terhubung</h1><p>Periksa koneksi lalu coba lagi.</p>
       <button onclick="location.reload()">Muat ulang</button></body>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // handler di bawah tidak memakai preloadResponse; hindari request ganda
  runtimeCaching: [
    // API, callback auth, cron: selalu network.
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },
    // Dokumen halaman & payload RSC/prefetch Next.js: network saja + fallback offline.
    {
      matcher: ({ request, url }: { request: Request; url: URL }) =>
        request.mode === "navigate" ||
        request.destination === "document" ||
        request.headers.get("RSC") === "1" ||
        url.searchParams.has("_rsc"),
      handler: networkOrOffline,
    },
    // Aset statis (JS/CSS/font/gambar) memakai strategi default Serwist.
    ...defaultCache,
  ],
});

serwist.addEventListeners();
