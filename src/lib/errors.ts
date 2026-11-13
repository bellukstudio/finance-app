import { log } from "@/lib/logger";

/** Pesan aman untuk pengguna. Detail Postgres (nama tabel/kolom/constraint) hanya masuk log server, tidak ke klien. */
export function pgMessage(e: { code?: string; message?: string } | null): string | null {
  if (!e) return null;
  switch (e.code) {
    case "23505": return "Data sudah ada (duplikat).";
    case "23503": return "Data masih dipakai oleh data lain.";
    // Pesan trigger kustom kategori memang ditulis untuk pengguna; selain itu disamarkan.
    case "23514": return e.message?.startsWith("Kategori") ? e.message : "Data tidak memenuhi aturan validasi.";
    case "42501": return "Anda tidak memiliki izin untuk tindakan ini.";
    case "22P02": return "Input tidak valid.";
    default:
      log("error", "db.error", { code: e.code, message: e.message });
      return "Terjadi kesalahan. Coba lagi beberapa saat.";
  }
}
