import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";
import { safeNext } from "@/lib/safe-redirect";
import { PurgeCaches } from "@/components/purge-caches";

const NEXT_COOKIE = "auth_next";
const ERRORS: Record<string, string> = {
  start: "Tidak bisa memulai login Google. Coba lagi.",
  auth: "Login gagal diproses. Coba lagi, dan jika berulang periksa pengaturan Redirect URL di Supabase.",
  denied: "Login dibatalkan atau ditolak oleh Google.",
};

async function signIn(fd: FormData) {
  "use server";
  const next = safeNext(String(fd.get("next") ?? ""));
  // `next` disimpan di cookie singkat, bukan di query redirectTo, supaya redirectTo selalu persis
  // `${origin}/auth/callback` dan cocok dengan daftar Redirect URLs di Supabase.
  (await cookies()).set(NEXT_COOKIE, next, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/auth", maxAge: 600,
  });
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await getOrigin()}/auth/callback` } });
  if (error || !data.url) redirect("/login?error=start");
  redirect(data.url);
}

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="login-wrap">
      <form action={signIn} className="card login-card">
        <PurgeCaches />
        <input type="hidden" name="next" value={safeNext(next)} />
        <h1>Family Finance</h1>
        <p>Kelola keuangan keluarga dalam satu tempat.</p>
        {error && ERRORS[error] && <p role="alert" className="err">{ERRORS[error]}</p>}
        <button type="submit">Masuk dengan Google</button>
      </form>
    </div>
  );
}
