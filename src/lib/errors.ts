export function pgMessage(e: { code?: string; message?: string } | null): string | null {
  if (!e) return null;
  switch (e.code) {
    case "23505": return "Data sudah ada (duplikat).";
    case "23503": return "Data masih dipakai oleh data lain.";
    case "23514": return e.message?.includes("Kategori") ? e.message : "Data tidak memenuhi aturan validasi.";
    case "42501": return "Anda tidak memiliki izin untuk tindakan ini.";
    default: return "Terjadi kesalahan: " + (e.message ?? "tidak diketahui");
  }
}
