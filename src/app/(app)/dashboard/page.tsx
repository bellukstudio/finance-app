import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCtx } from "@/lib/context";
import { rupiah, tanggal } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { budgetStatus, STATUS_LABEL } from "@/lib/budget";
import { PeriodForm } from "@/components/period-form";
import { CategoryPie, IncomeExpenseChart, WalletBars } from "@/components/charts";

async function createFamily(fd: FormData) {
  "use server";
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return;
  const sb = await supabaseServer();
  await sb.rpc("create_family_with_defaults", { fname: name });
  redirect("/dashboard");
}
type Row = Record<string, string | number>;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const sb0 = await supabaseServer();
  const { data: { user } } = await sb0.auth.getUser();
  if (!user) redirect("/login");
  const { data: mem } = await sb0.from("family_members").select("family_id").is("deleted_at", null).limit(1).maybeSingle();
  if (!mem) return <form action={createFamily} className="card stack" style={{ maxWidth: 420, display: "grid", gap: 12 }}><h1>Buat Keluarga</h1><input name="name" placeholder="Nama keluarga" required /><button>Buat</button></form>;
  const { sb, familyId } = await getCtx();
  const p = resolvePeriod(sp.period, sp.from, sp.to);
  const [{ data: s }, { data: wallets }, { data: series }, { data: cats }, { data: bu }, { data: recent }] = await Promise.all([
    sb.rpc("dashboard_summary", { fid: familyId, d_from: p.from, d_to: p.to }),
    sb.from("wallet_balances").select("name,balance").eq("family_id", familyId),
    sb.rpc("report_series", { fid: familyId, d_from: p.from, d_to: p.to, grain: p.from.slice(0, 4) === p.to.slice(0, 4) && p.key === "year" ? "month" : "day" }),
    sb.rpc("report_by_category", { fid: familyId, d_from: p.from, d_to: p.to, t: "expense" }),
    sb.from("budget_usage").select("budget,used").lte("start_date", p.to).gte("end_date", p.from).eq("scope", "category"),
    sb.from("transactions").select("id,date,type,amount,description").is("deleted_at", null).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(8)]);
  const x = (s ?? {}) as Record<string, number>;
  const budget = (bu ?? []).reduce((a, r) => a + Number(r.budget), 0), used = (bu ?? []).reduce((a, r) => a + Number(r.used), 0);
  const worth = (x.total_balance ?? 0) + (x.assets ?? 0) - (x.debts ?? 0);
  const net = (x.income ?? 0) - (x.expense ?? 0);
  const pct = budget ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const stat = (l: string, v: number, c = "") => <div className="card stat"><small>{l}</small><b className={c}>{rupiah(v)}</b></div>;
  return (<main>
    <div className="head"><div><h1>Dashboard</h1><small>Ringkasan keuangan keluarga</small></div><PeriodForm current={p.key} from={p.from} to={p.to} /></div>
    <section className="card hero">
      <div><small>Kekayaan bersih</small><div className="big">{rupiah(worth)}</div><small>Saldo dompet + aset − utang</small></div>
      <div style={{ textAlign: "right" }}><small>Selisih periode</small><div><b className={net >= 0 ? "inc" : "exp"} style={{ fontSize: "1.3rem" }}>{net >= 0 ? "+" : "−"}{rupiah(Math.abs(net))}</b></div><small>Total saldo {rupiah(x.total_balance ?? 0)}</small></div>
    </section>
    <section className="grid g4">{stat("Pemasukan", x.income ?? 0, "inc")}{stat("Pengeluaran", x.expense ?? 0, "exp")}{stat("Aset", x.assets ?? 0)}{stat("Utang", x.debts ?? 0)}</section>
    <section className="card"><div className="head"><h2>Budget</h2>{budget > 0 && <span className="pill">{STATUS_LABEL[budgetStatus(used, budget)]}</span>}</div>
      {budget ? <><div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i className={used > budget ? "over" : ""} style={{ width: `${pct}%` }} /></div>
        <small>{rupiah(used)} dari {rupiah(budget)} · sisa {rupiah(budget - used)}</small></> : <p className="muted">Belum ada budget pada periode ini.</p>}</section>
    <section className="grid g2">
      <div className="card"><h2>Pemasukan vs pengeluaran</h2><IncomeExpenseChart data={((series ?? []) as Row[]).map(r => ({ label: tanggal(String(r.bucket)), income: Number(r.income), expense: Number(r.expense) }))} /></div>
      <div className="card"><h2>Pengeluaran per kategori</h2><CategoryPie data={((cats ?? []) as Row[]).map(r => ({ name: String(r.name), value: Number(r.total) }))} /></div>
    </section>
    <section className="grid g2e">
      <div className="card"><h2>Saldo per dompet</h2><WalletBars data={(wallets ?? []).map(w => ({ name: w.name, value: Number(w.balance) }))} /></div>
      <div className="card"><div className="head"><h2>Transaksi terbaru</h2><a href="/transaksi">Lihat semua</a></div>
        {!recent?.length ? <p className="muted">Belum ada transaksi.</p> : <ul className="list">{recent.map(t => <li key={t.id}>
          <span>{t.description || (t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer")}<br /><small>{tanggal(t.date)}</small></span>
          <b className={t.type === "income" ? "inc" : t.type === "expense" ? "exp" : ""}>{t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{rupiah(Number(t.amount))}</b></li>)}</ul>}</div>
    </section>
  </main>);
}
