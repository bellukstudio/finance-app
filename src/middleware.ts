import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-redirect";

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const isProd = process.env.NODE_ENV === "production";
const cookieOptions: CookieOptions = {
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax",
  secure: isProd,
  httpOnly: true,  // app tidak memakai browser client Supabase -> token sesi tidak perlu terbaca JS
};

/** Origin Supabase (signed URL lampiran lama + redirect OAuth) untuk whitelist CSP. */
const supabaseOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin; } catch { return ""; } })();
const CLOUDINARY = "https://api.cloudinary.com https://res.cloudinary.com";

function buildCsp(nonce: string) {
  const sb = supabaseOrigin;
  return [
    "default-src 'self'",
    // nonce + strict-dynamic: hanya script bernonce (dan yang dimuatnya) yang jalan; tanpa 'unsafe-inline' untuk script.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",  // React/Next memakai atribut style inline
    `img-src 'self' data: blob: ${CLOUDINARY} ${sb}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
    `frame-src 'self' ${CLOUDINARY} ${sb}`.trim(),  // pratinjau PDF nota
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${sb} https://accounts.google.com`.trim(),
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function harden(res: NextResponse, csp: string, path: string) {
  // CSP_REPORT_ONLY=1 -> hanya melapor di console (untuk uji sebelum diberlakukan).
  res.headers.set(process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  // Link undangan membawa token di URL: jangan bocor lewat Referer.
  res.headers.set("Referrer-Policy", path.startsWith("/undangan") ? "no-referrer" : "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (isProd) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return res;
}

export async function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const path = req.nextUrl.pathname;
  const cspHeader = process.env.CSP_REPORT_ONLY === "1" ? "content-security-policy-report-only" : "content-security-policy";

  // Dihitung ulang tiap kali agar cookie sesi yang baru di-refresh ikut diteruskan ke render.
  const forward = () => {
    const h = new Headers(req.headers);
    h.set("x-nonce", nonce);
    h.set(cspHeader, csp);
    return NextResponse.next({ request: { headers: h } });
  };

  let res = forward();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions,
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = forward();
        // options (mis. maxAge: 0 saat sign-out) dipertahankan; httpOnly/secure selalu dipaksa.
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...cookieOptions, ...options, httpOnly: true, secure: cookieOptions.secure }));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const open = path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/api");
  if (!user && !open) {
    const u = new URL("/login", req.url);
    u.searchParams.set("next", safeNext(path, "/dashboard"));
    return harden(NextResponse.redirect(u), csp, path);
  }
  return harden(res, csp, path);
}
// sw.js, manifest.json & ikon PWA dikecualikan: harus bisa diambil tanpa sesi/cookie,
// kalau tidak browser dapat redirect ke /login saat registrasi service worker — dan
// spesifikasi Service Worker melarang script resource yang di-redirect (SecurityError).
export const config = { matcher: ["/((?!_next|favicon.ico|sw\\.js|manifest\\.json|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|apple-touch-icon\\.png).*)"] };
