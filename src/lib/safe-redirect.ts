/**
 * Hanya izinkan redirect ke path internal. Menolak `//host`, `/\host` (browser menganggap `\` = `/`),
 * skema (`javascript:`, `https:`), karakter kontrol, dan path yang setelah di-parse berpindah origin.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "http://internal.invalid");
    if (u.origin !== "http://internal.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
