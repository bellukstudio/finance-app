import type { SupabaseClient } from "@supabase/supabase-js";
/** Rate limit terpusat di Postgres (aman untuk Vercel serverless). true = diizinkan. Fail-open bila DB error. */
export async function rateLimit(sb: SupabaseClient, key: string, limit: number, windowSec: number): Promise<boolean> {
  const { data, error } = await sb.rpc("rate_limit_hit", { k: key, lim: limit, win: windowSec });
  return error ? true : data === true;
}
