import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron-auth";
import { log } from "@/lib/logger";
export const maxDuration = 60;
async function handler(req: Request) {
  if (!cronAuthorized(req)) return new Response("Forbidden", { status: 403 });
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("orphan_storage_objects");
  if (error) { log("error", "cron.orphans", { error: error.message }); return Response.json({ error: error.message }, { status: 500 }); }
  const names = ((data ?? []) as { name: string }[]).map(x => x.name); let removed = 0;
  for (let i = 0; i < names.length; i += 100) { const chunk = names.slice(i, i + 100); const r = await admin.storage.from("receipts").remove(chunk); if (!r.error) removed += chunk.length; }
  log("info", "cron.orphans", { found: names.length, removed });
  return Response.json({ found: names.length, removed });
}
export const GET = handler; export const POST = handler;
