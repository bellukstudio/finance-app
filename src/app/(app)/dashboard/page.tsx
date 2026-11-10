import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCtx } from "@/lib/context";
import { rupiah } from "@/lib/format";
import { todayJakarta } from "@/lib/period";
import { CategoryPie, IncomeExpenseChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { TxRow } from "@/components/tx-row";

async function createFamily(fd: FormData) {
  "use server";
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return;
  const sb = await supabaseServer();
  await sb.rpc("create_family_with_defaults", { fname: name });
  redirect("/dashboard");
}
type Row = Record<string, string | number>;
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (y: number, m: number, d: number) => { const x = new Date(Date.UTC(y, m - 1 + d, 1)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`; };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const sb0 = await supabaseServer();
  const { data: { user } } = await sb0.auth.getUser();
  if (!user) redirect("/login");
  const { data: mem } = await sb0.from("family_members").select("family_id").is("deleted_at", null).limit(1).maybeSingle();
  if (!mem) return <form action={createFamily} className="card stack" style={{ maxWidth: 420, display: "grid", gap: 12 }}><h1>Buat Keluarga</h1><input name="name" placeholder="Nama keluarga" required /><button>Buat</button></form>;
  const { sb, familyId } = await getCtx();
  const cur = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m ?? "") ? sp.m! : todayJakarta().slice(0, 7);
  const [y, mo] = cur.split("-").map(Number);
  const from = `${cur}-01`, to = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  const [{ data: s }, { data: wallets }, { data: series }, { data: catTot }, { data: bs }, { data: bu }, { data: recent }, { data: trf }, { data: debts }, { data: pays }, { data: cats }] = await Promise.all([
    sb.rpc("dashboard_summary", { fid: familyId, d_from: from, d_to: to }),
    sb.from("wallet_balances").select("wallet_id,name,balance").eq("family_id", familyId),
    sb.rpc("report_series", { fid: familyId, d_from: from, d_to: to, grain: "day" }),
    sb.rpc("report_by_category", { fid: familyId, d_from: from, d_to: to, t: "expense" }),
    sb.from("budgets").select("id,name,category_id,wallet_id,start_date,end_date,amount").is("deleted_at", null).lte("start_date", to).gte("end_date", from),
    sb.from("budget_usage").select("budget_id,used,topup"),
    sb.from("transactions").select("id,date,type,amount,description,note,wallet_id,to_wallet_id,category_id,budget_id").is("deleted_at", null).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    sb.from("transactions").select("amount").eq("type", "transfer").is("deleted_at", null).gte("date", from).lte("date", to),
    sb.from("debts").select("id,direction,principal").is("deleted_at", null),
    sb.from("debt_payments").select("debt_id,amount").is("deleted_at", null),
    sb.from("categories").select("id,name").is("deleted_at", null)]);
  const x = (s ?? {}) as Record<string, number>;
  const income = x.income ?? 0, expense = x.expense ?? 0, net = income - expense;
  const trfSum = (trf ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const paid = new Map<string, number>(); (pays ?? []).forEach((p) => paid.set(p.debt_id, (paid.get(p.debt_id) ?? 0) + Number(p.amount)));
  const rem = (dir: string) => (debts ?? []).filter((d) => d.direction === dir).reduce((a, d) => a + Math.max(0, Number(d.principal) - (paid.get(d.id) ?? 0)), 0);
  const usage = new Map((bu ?? []).map((u) => [u.budget_id, u]));
  const alerts = (bs ?? []).map((b) => { const u = usage.get(b.id), total = Number(b.amount) + Number(u?.topup ?? 0), used = Number(u?.used ?? 0); return { name: b.name || "Budget", total, used, pct: total ? (used / total) * 100 : 0 }; })
    .filter((a) => a.pct >= 90).sort((a, b) => b.pct - a.pct);
  const maxBal = Math.max(1, ...(wallets ?? []).map((w) => Math.abs(Number(w.balance))));
  const maps = { wallets: new Map((wallets ?? []).map((w) => [w.wallet_id as string, w.name as string])), cats: new Map((cats ?? []).map((c) => [c.id, c.name])), budgets: new Map((bs ?? []).map((b) => [b.id, b.name || "Budget"])) };
  const qs = `from=${from}&to=${to}`;
  const tile = (l: string, v: number, c: string, ic: Parameters<typeof Icon>[0]["n"], sub: string, href?: string) => {
    const body = <><span className="ic"><Icon n={ic} /></span><small className="muted">{l}</small><b>{rupiah(v)}</b><small className="muted">{sub}</small></>;
    return href ? <Link href={href} className="sc" style={{ ["--c" as string]: c }}>{body}</Link> : <div className="sc" style={{ ["--c" as string]: c }}>{body}</div>;
  };
  return (<main>
    <div className="ph"><div className="l"><h1>Dashboard</h1>
      <div className="mnav" role="group" aria-label="Pilih bulan"><Link href={`?m=${shift(y, mo, -1)}`} aria-label="Bulan sebelumnya"><Icon n="left" /></Link><span>{MONTHS[mo - 1]} {y}</span><Link href={`?m=${shift(y, mo, 1)}`} aria-label="Bulan berikutnya"><Icon n="right" /></Link></div></div>
      <button type="button" data-open-tx><Icon n="plus" /> Transaksi</button></div>
    <div className="banners">
      {alerts.map((a) => a.pct >= 100
        ? <div key={a.name} className="banner red"><Icon n="alert" /><b>{a.name}</b> Budget habis! {rupiah(a.used)} / {rupiah(a.total)}</div>
        : <div key={a.name} className="banner amber"><Icon n="bell" /><b>{a.name}</b> {Math.round(a.pct)}% terpakai. Sisa {rupiah(a.total - a.used)}</div>)}
      <div className="banner info"><Icon n="hand" /><span>Utang: <b className="mono">{rupiah(rem("payable"))}</b></span><span>Piutang: <b className="mono">{rupiah(rem("receivable"))}</b></span></div>
    </div>
    <section className="grid g4">
      {tile("Pemasukan", income, "var(--income)", "down", "Klik untuk detail", `/transaksi?type=income&${qs}`)}
      {tile("Pengeluaran", expense, "var(--expense)", "up", income ? `${Math.round((expense / income) * 100)}% dari pemasukan` : "Belum ada pemasukan", `/transaksi?type=expense&${qs}`)}
      {tile("Selisih", net, net >= 0 ? "var(--warn)" : "var(--expense)", "scale", income ? `Saving rate ${Math.round((net / income) * 100)}%` : "Saving rate -")}
      {tile("Transfer", trfSum, "var(--transfer)", "swap", `${trf?.length ?? 0} transaksi`, `/transaksi?type=transfer&${qs}`)}
    </section>
    <section className="grid g2e">
      <div className="card"><h2>Per Kategori</h2><CategoryPie data={((catTot ?? []) as Row[]).map(r => ({ name: String(r.name), value: Number(r.total) }))} /></div>
      <div className="card"><h2>Tren Harian</h2><IncomeExpenseChart data={((series ?? []) as Row[]).map(r => ({ label: String(r.bucket).slice(8), income: Number(r.income), expense: Number(r.expense) }))} /></div>
    </section>
    <section className="grid g2e">
      <div className="card"><div className="between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Transaksi Terbaru</h2><Link href="/transaksi" className="btn ghost sm" style={{ padding: ".25rem .7rem" }}>Lihat semua</Link></div>
        {!recent?.length ? <p className="muted">Belum ada transaksi.</p> : <div className="dg">{recent.map(t => <TxRow key={t.id} t={t} maps={maps} />)}</div>}</div>
      <div className="card"><div className="between" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>Saldo per Wallet</h2><small className="muted mono">{rupiah(x.total_balance ?? 0)}</small></div>
        {!wallets?.length ? <p className="muted">Belum ada dompet.</p> : wallets.map(w => { const v = Number(w.balance); return <div key={w.wallet_id} className="wrow"><span>{w.name}</span><span className="t"><i style={{ width: `${Math.max(v > 0 ? 1.5 : 0, (Math.max(v, 0) / maxBal) * 100)}%` }} /></span><b className={v < 0 ? "neg" : ""}>{rupiah(v)}</b></div>; })}</div>
    </section>
  </main>);
}
