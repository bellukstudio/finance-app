import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) { const sb = await supabaseServer(); await sb.auth.exchangeCodeForSession(code); }
  const n = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safe = n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
  return NextResponse.redirect(new URL(safe, req.nextUrl.origin));
}
