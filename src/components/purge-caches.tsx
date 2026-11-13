"use client";
import { useEffect } from "react";

/**
 * Dipasang di halaman /login: setelah keluar, hapus cache runtime service worker (halaman & data RSC berisi data keuangan)
 * supaya tidak bisa dibuka offline oleh orang berikutnya di perangkat yang sama. Precache aset statis dipertahankan.
 */
export function PurgeCaches() {
  useEffect(() => {
    if (typeof caches === "undefined") return;
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith("serwist-precache")).map((k) => caches.delete(k))))
      .catch(() => {});
  }, []);
  return null;
}
