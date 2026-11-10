import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron-auth";
import { log } from "@/lib/logger";
async function handler(req: Request) {
  if (!cronAuthorized(req)) return new Response("Forbidden", { status: 403 });
  const { data, error } = await supabaseAdmin().rpc("run_recurring");  // idempotent
  log(error ? "error" : "info", "cron.recurring", { created: data, error: error?.message });
  return Response.json({ created: data, error: error?.message ?? null });
}
export const GET = handler; export const POST = handler;
