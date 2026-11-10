import "server-only";
import { headers } from "next/headers";
/** Origin dari request (mendukung domain produksi & preview Vercel); fallback ke APP_URL. */
export async function getOrigin() {
  const h = await headers(); const host = h.get("x-forwarded-host") ?? h.get("host"); const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : process.env.APP_URL!;
}
