import type { SupabaseClient } from "@supabase/supabase-js";
/**
 * Rate limit terpusat di Postgres (aman untuk Vercel serverless). true = diizinkan.
 * Default fail-open bila DB error (ketersediaan). Untuk aksi sensitif (tebak token, undangan)
 * pakai `failClosed: true` agar error DB tidak membuka celah brute-force.
 */
export async function rateLimit(sb: SupabaseClient, key: string, limit: number, windowSec: number, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  const { data, error } = await sb.rpc("rate_limit_hit", { k: key, lim: limit, win: windowSec });
  if (error) return !opts.failClosed;
  return data === true;
}
