import { Serwist } from "serwist";  // NetworkOnly tidak dipakai lagi

const networkOrOffline = async ({ request }: { request: Request }) => {
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