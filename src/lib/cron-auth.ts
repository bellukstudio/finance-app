import { timingSafeEqual } from "node:crypto";
/** Vercel Cron mengirim `Authorization: Bearer $CRON_SECRET` otomatis jika CRON_SECRET diset. */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET; if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
