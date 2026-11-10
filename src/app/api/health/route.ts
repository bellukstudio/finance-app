import { log } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
export async function GET() {
  const { error } = await supabaseAdmin().from("families").select("id", { head: true, count: "exact" }).limit(1);
  if (error) log("error", "health", { error: error.message });
  return Response.json({ ok: !error }, { status: error ? 503 : 200 });
}
