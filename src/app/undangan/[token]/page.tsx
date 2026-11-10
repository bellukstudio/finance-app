import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";

async function accept(fd: FormData) {
  "use server";
  const sb = await supabaseServer();
  const { error } = await sb.rpc("accept_invitation", { tok: String(fd.get("token")) });
  redirect(error ? "/undangan/gagal" : "/dashboard");
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === "gagal") return (
    <div className="auth-wrap"><section className="card auth-card" role="alert">
      <div className="auth-ico bad"><Icon n="alert" /></div>
      <h1>Undangan tidak bisa dipakai</h1>
      <p>Link undangan ini tidak valid, sudah kedaluwarsa, atau sudah dipakai. Minta Owner/Admin keluarga membuat link undangan baru.</p>
      <Link href="/dashboard" className="btn auth-btn">Ke dashboard</Link>
    </section></div>);
  return (
    <div className="auth-wrap"><form action={accept} className="card auth-card">
      <div className="auth-ico"><Icon n="hand" /></div>
      <h1>Undangan Keluarga</h1>
      <p>Anda diundang untuk bergabung ke keluarga di Family Finance. Setelah diterima, Anda bisa melihat dan mencatat keuangan bersama sesuai peran yang diberikan.</p>
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="auth-btn" pending="Menerima undangan…">Terima undangan</SubmitButton>
      <Link href="/dashboard" className="auth-sub">Nanti saja</Link>
    </form></div>);
}
