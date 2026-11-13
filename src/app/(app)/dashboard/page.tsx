import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getOptionalCtx } from "@/lib/context";
import { rateLimit } from "@/lib/rate-limit";
import { todayJakarta } from "@/lib/period";
import { DashboardInteractions } from "@/components/dashboard-interactions";

async function createFamily(fd: FormData) {
  "use server";
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  if (!(await rateLimit(sb, "create_group", 5, 3600))) return;
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
  const ctx = await getOptionalCtx();
  if (!ctx) return <form action={createFamily} className="card stack" style={{ maxWidth: 420, display: "grid", gap: 12 }}><h1>Buat Keluarga</h1><input name="name" placeholder="Nama keluarga" required /><button>Buat</button></form>;
  const { sb, familyId, ledger } = ctx;
  const cur = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m ?? "") ? sp.m! : todayJakarta().slice(0, 7);
  const y = Number(cur.slice(0, 4)), mo = Number(cur.slice(5, 7));
  const from = `${cur}-01`, to = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  const [{ data: s }, { data: wallets }, { data: series }, { data: catTot }, { data: bs }, { data: bu }, { data: recent }, { data: trf }, { data: monthTx }, { data: debts }, { data: pays }, { data: cats }] = await Promise.all([
    sb.rpc("dashboard_summary", { fid: familyId, d_from: from, d_to: to }),
    sb.from("wallet_balances").select("wallet_id,name,balance").eq("family_id", familyId),
    sb.rpc("report_series", { fid: familyId, d_from: from, d_to: to, grain: "day" }),
    sb.rpc("report_by_category", { fid: familyId, d_from: from, d_to: to, t: "expense" }),
    sb.from("budgets").select("id,name,category_id,wallet_id,start_date,end_date,amount").eq("family_id", familyId).is("deleted_at", null).lte("start_date", to).gte("end_date", from),
    sb.from("budget_usage").select("budget_id,used,topup").eq("family_id", familyId),
    sb.from("transactions").select("id,date,type,amount,description,note,wallet_id,to_wallet_id,category_id,budget_id").eq("family_id", familyId).is("deleted_at", null).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    sb.from("transactions").select("amount").eq("family_id", familyId).eq("type", "transfer").is("deleted_at", null).gte("date", from).lte("date", to),
    sb.from("transactions").select("id,date,type,amount,description,note,wallet_id,to_wallet_id,category_id,budget_id,debt_payment_id").eq("family_id", familyId).is("deleted_at", null).gte("date", from).lte("date", to).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    sb.from("debts").select("id,direction,principal").eq("family_id", familyId).is("deleted_at", null),
    sb.from("debt_payments").select("debt_id,amount").eq("family_id", familyId).is("deleted_at", null),
    sb.from("categories").select("id,name").eq("family_id", familyId).is("deleted_at", null)]);
  const x = (s ?? {}) as Record<string, number>;
  const income = x.income ?? 0, expense = x.expense ?? 0, net = income - expense;
  const trfSum = (trf ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const paid = new Map<string, number>(); (pays ?? []).forEach((p) => paid.set(p.debt_id, (paid.get(p.debt_id) ?? 0) + Number(p.amount)));
  const rem = (dir: string) => (debts ?? []).filter((d) => d.direction === dir).reduce((a, d) => a + Math.max(0, Number(d.principal) - (paid.get(d.id) ?? 0)), 0);
  const usage = new Map((bu ?? []).map((u) => [u.budget_id, u]));
  const alerts = (bs ?? []).map((b) => { const u = usage.get(b.id), total = Number(b.amount) + Number(u?.topup ?? 0), used = Number(u?.used ?? 0); return { name: b.name || "Budget", total, used, pct: total ? (used / total) * 100 : 0 }; })
    .filter((a) => a.pct >= 90).sort((a, b) => b.pct - a.pct);
  return <DashboardInteractions
    ledger={ledger} monthLabel={`${MONTHS[mo - 1]} ${y}`} year={y} month={mo} from={from} to={to}
    income={income} expense={expense} net={net} transfers={trfSum} transferCount={trf?.length ?? 0}
    payable={rem("payable")} receivable={rem("receivable")} alerts={alerts}
    transactions={monthTx ?? []} recent={recent ?? []}
    categories={(cats ?? []).map((c) => ({ id: c.id, name: c.name }))}
    budgets={(bs ?? []).map((b) => ({ id: b.id, name: b.name || "Budget" }))}
    categoryTotals={((catTot ?? []) as Row[]).map((r) => ({ id: r.category_id ? String(r.category_id) : undefined, name: String(r.name), value: Number(r.total) }))}
    series={(series ?? []) as Row[]}
    wallets={(wallets ?? []).map((w) => ({ wallet_id: String(w.wallet_id), name: String(w.name), balance: Number(w.balance) }))}
    totalBalance={x.total_balance ?? 0} />;
}
