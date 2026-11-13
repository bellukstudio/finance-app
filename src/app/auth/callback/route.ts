import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";
import { log } from "@/lib/logger";

const NEXT_COOKIE = "auth_next";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  // safeNext menolak //host, /\host, skema, dan karakter kontrol (open redirect).
  const next = safeNext(req.nextUrl.searchParams.get("next") ?? jar.get(NEXT_COOKIE)?.value);
  jar.set(NEXT_COOKIE, "", { path: "/auth", maxAge: 0 });
  const toLogin = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.nextUrl.origin));

  if (req.nextUrl.searchParams.get("error")) {
    log("warn", "auth.callback", { provider_error: req.nextUrl.searchParams.get("error_description") ?? req.nextUrl.searchParams.get("error") });
    return toLogin("denied");
  }
  const code = req.nextUrl.searchParams.get("code");
  const sb = await supabaseServer();
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) { log("warn", "auth.callback", { error: error.message }); return toLogin("auth"); }
  } else {
    // Tanpa ?code: hanya lanjut bila sudah punya sesi. Dulu langsung ke `next` lalu dipantulkan middleware
    // kembali ke /login tanpa pesan apa pun.
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { log("warn", "auth.callback", { error: "callback tanpa code & tanpa sesi" }); return toLogin("auth"); }
  }
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
