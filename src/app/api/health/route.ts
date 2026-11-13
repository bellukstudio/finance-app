import { log } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
export async function GET() {
  const { error } = await supabaseAdmin().from("families").select("id", { head: true, count: "exact" }).limit(1);
  if (error) log("error", "health", { error: error.message });
  // Endpoint publik: cache singkat di CDN agar tidak jadi jalur amplifikasi beban ke database (service role).
  return Response.json({ ok: !error }, { status: error ? 503 : 200, headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" } });
}
