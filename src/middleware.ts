import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const cookieOptions: CookieOptions = {
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions,
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...cookieOptions, ...options }));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const open = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/auth") || req.nextUrl.pathname.startsWith("/api");
  if (!user && !open) {
    const u = new URL("/login", req.url);
    u.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(u);
  }
  return res;
}
// sw.js, manifest.json & ikon PWA dikecualikan: harus bisa diambil tanpa sesi/cookie,
// kalau tidak browser dapat redirect ke /login saat registrasi service worker — dan
// spesifikasi Service Worker melarang script resource yang di-redirect (SecurityError).
export const config = { matcher: ["/((?!_next|favicon.ico|sw\\.js|manifest\\.json|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|apple-touch-icon\\.png).*)"] };
