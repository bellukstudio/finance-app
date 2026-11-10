import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";
async function signIn(fd: FormData) {
  "use server";
  const next = String(fd.get("next") ?? "/dashboard");
  const sb = await supabaseServer();
  const { data } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (data.url) redirect(data.url);
}
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="login-wrap">
      <form action={signIn} className="card login-card">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <h1>Family Finance</h1>
        <p>Kelola keuangan keluarga dalam satu tempat.</p>
        <button type="submit">Masuk dengan Google</button>
      </form>
    </div>
  );
}
