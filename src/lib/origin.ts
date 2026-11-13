import "server-only";
import { headers } from "next/headers";
/**
 * Origin untuk link yang dikirim ke pengguna (OAuth redirectTo, link undangan).
 * Di produksi Vercel dipaksa memakai APP_URL agar header Host/X-Forwarded-Host palsu tidak bisa meracuni link;
 * di preview/lokal memakai origin request.
 */
export async function getOrigin() {
  if (process.env.VERCEL_ENV === "production" && process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers(); const host = h.get("x-forwarded-host") ?? h.get("host"); const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : process.env.APP_URL!;
}
