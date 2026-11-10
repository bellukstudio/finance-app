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
  if (!mem) return <form action={createFamily}><h1>Buat Keluarga</h1><input name="name" placeholder="Nama keluarga" required /><button>Buat</button></form>;
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
  const card = (l: string, v: string) => <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, minWidth: 150 }}><small>{l}</small><div><b>{v}</b></div></div>;
  return (<main><h1>Dashboard</h1><PeriodForm current={p.key} from={p.from} to={p.to} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {card("Total saldo", rupiah(x.total_balance ?? 0))}{card("Pemasukan", rupiah(x.income ?? 0))}{card("Pengeluaran", rupiah(x.expense ?? 0))}
      {card("Selisih", rupiah((x.income ?? 0) - (x.expense ?? 0)))}{card("Aset", rupiah(x.assets ?? 0))}{card("Utang", rupiah(x.debts ?? 0))}{card("Net worth", rupiah(worth))}
      {card("Budget terpakai", budget ? `${rupiah(used)} / ${rupiah(budget)} (${STATUS_LABEL[budgetStatus(used, budget)]})` : "Belum ada budget")}
      {card("Sisa budget", budget ? rupiah(budget - used) : "-")}</div>
    <p><small>Net worth = saldo dompet + aset − utang.</small></p>
    <h2>Pemasukan vs Pengeluaran</h2><IncomeExpenseChart data={((series ?? []) as Row[]).map(r => ({ label: tanggal(String(r.bucket)), income: Number(r.income), expense: Number(r.expense) }))} />
    <h2>Pengeluaran per kategori</h2><CategoryPie data={((cats ?? []) as Row[]).map(r => ({ name: String(r.name), value: Number(r.total) }))} />
    <h2>Saldo per dompet</h2><WalletBars data={(wallets ?? []).map(w => ({ name: w.name, value: Number(w.balance) }))} />
    <h2>Transaksi terbaru</h2>{!recent?.length ? <p>Belum ada transaksi.</p> : <ul>{recent.map(t => <li key={t.id}>{tanggal(t.date)} · {t.type} · {rupiah(Number(t.amount))} · {t.description}</li>)}</ul>}</main>);
}
