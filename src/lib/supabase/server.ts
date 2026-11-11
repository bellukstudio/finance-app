import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Keep the refresh-token cookie across browser restarts, including installed PWAs.
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const cookieOptions: CookieOptions = {
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, { ...cookieOptions, ...options }));
        } catch {
          // Server Components cannot write cookies; middleware refreshes them on requests.
        }
      },
    },
  });
}
