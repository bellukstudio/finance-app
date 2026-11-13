import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";
import { log } from "@/lib/logger";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) { log("warn", "auth.callback", { error: error.message }); return NextResponse.redirect(new URL("/login", req.nextUrl.origin)); }
  }
  // safeNext menolak //host, /\host, skema, dan karakter kontrol (open redirect).
  return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.nextUrl.origin));
}
