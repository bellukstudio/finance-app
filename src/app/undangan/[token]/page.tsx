import Link from "next/link";
import { redirect } from "next/navigation";
import { latestGroupId, setLedgerCookie } from "@/lib/context";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";

async function accept(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) redirect("/undangan/gagal");
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/undangan/${encodeURIComponent(token)}`);
  // Cegah tebak-tebakan token undangan (fail-closed: error DB tidak membuka celah).
  if (!(await rateLimit(sb, "accept_invitation", 10, 600, { failClosed: true }))) redirect("/undangan/gagal");
  const { error } = await sb.rpc("accept_invitation", { tok: token });
  if (error) redirect("/undangan/gagal");
  // Buka langsung grup yang baru diikuti; catatan pribadi user tidak terpengaruh.
  const gid = await latestGroupId();
  if (gid) await setLedgerCookie(gid);
  redirect("/dashboard");
}

const BENEFITS = [
  "Lihat ringkasan keuangan keluarga secara real-time",
  "Catat pemasukan dan pengeluaran bersama",
  "Akses sesuai peran yang diberikan Owner/Admin",
];

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="auth-wrap">
      <form action={accept} className="card invite-card">
        <div className="invite-hero">
          <div className="invite-ico"><Icon n="hand" /></div>
          <span className="invite-badge">Undangan</span>
        </div>

        <h1>Bergabung ke keluarga di Family Finance</h1>
        <p className="invite-lead">
          Anda diundang untuk mengelola keuangan bersama. Terima undangan ini untuk mulai berkolaborasi.
        </p>

        <ul className="invite-list">
          {BENEFITS.map((b) => <li key={b}>{b}</li>)}
        </ul>

        <input type="hidden" name="token" value={token} />
        <SubmitButton className="auth-btn" pending="Menerima undangan…">Terima undangan</SubmitButton>
        <Link href="/dashboard" className="auth-sub">Nanti saja</Link>
      </form>
    </div>
  );
}