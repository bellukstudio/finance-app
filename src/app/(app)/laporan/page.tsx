import { getCtx } from "@/lib/context";
import { rupiah, tanggal } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { budgetStatus, STATUS_LABEL } from "@/lib/budget";
import { PeriodForm } from "@/components/period-form";
import { CategoryPie, IncomeExpenseChart, WalletBars } from "@/components/charts";

const REPORTS = { cashflow: "Income vs Expense / Cash Flow", expense_cat: "Expense by Category", income_cat: "Income by Category", wallet: "Wallet Balance", budget: "Budget Performance" } as const;
type Key = keyof typeof REPORTS; type Row = Record<string, string | number>;

export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string; period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const r: Key = sp.r && sp.r in REPORTS ? (sp.r as Key) : "cashflow";
  const { sb, familyId } = await getCtx();
  const p = resolvePeriod(sp.period, sp.from, sp.to);
  let body: React.ReactNode = null;
  if (r === "cashflow") {
    const { data } = await sb.rpc("report_series", { fid: familyId, d_from: p.from, d_to: p.to, grain: p.key === "year" ? "month" : "day" });
    const rows = ((data ?? []) as Row[]).map(x => ({ label: tanggal(String(x.bucket)), income: Number(x.income), expense: Number(x.expense) }));
    body = <><IncomeExpenseChart data={rows} /><table><thead><tr><th>Periode</th><th>Masuk</th><th>Keluar</th><th>Arus kas</th></tr></thead><tbody>{rows.map(x => <tr key={x.label}><td>{x.label}</td><td>{rupiah(x.income)}</td><td>{rupiah(x.expense)}</td><td>{rupiah(x.income - x.expense)}</td></tr>)}</tbody></table></>;
  } else if (r === "expense_cat" || r === "income_cat") {
    const { data } = await sb.rpc("report_by_category", { fid: familyId, d_from: p.from, d_to: p.to, t: r === "expense_cat" ? "expense" : "income" });
    const rows = ((data ?? []) as Row[]).map(x => ({ name: String(x.name), value: Number(x.total) }));
    body = <><CategoryPie data={rows} /><ul>{rows.map(x => <li key={x.name}>{x.name}: {rupiah(x.value)}</li>)}</ul></>;
  } else if (r === "wallet") {
    const { data } = await sb.from("wallet_balances").select("name,balance").eq("family_id", familyId);
    const rows = (data ?? []).map(w => ({ name: w.name, value: Number(w.balance) }));
    body = <><WalletBars data={rows} /><ul>{rows.map(x => <li key={x.name}>{x.name}: {rupiah(x.value)}</li>)}</ul></>;
  } else {
    const [{ data: u }, { data: bs }, { data: cats }, { data: ws }] = await Promise.all([
      sb.from("budget_usage").select("budget_id,budget,used").lte("start_date", p.to).gte("end_date", p.from),
      sb.from("budgets").select("id,scope,category_id,wallet_id"), sb.from("categories").select("id,name"), sb.from("wallets").select("id,name")]);
    const m = new Map(bs?.map(b => [b.id, b])), cn = new Map(cats?.map(c => [c.id, c.name])), wn = new Map(ws?.map(w => [w.id, w.name]));
    body = <table><thead><tr><th>Budget</th><th>Anggaran</th><th>Terpakai</th><th>Status</th></tr></thead><tbody>{(u ?? []).map(x => { const b = m.get(x.budget_id);
      return <tr key={x.budget_id}><td>{b?.scope === "category" ? cn.get(b.category_id) : wn.get(b?.wallet_id)}</td><td>{rupiah(Number(x.budget))}</td><td>{rupiah(Number(x.used))}</td><td>{STATUS_LABEL[budgetStatus(Number(x.used), Number(x.budget))]}</td></tr>; })}</tbody></table>;
  }
  return (<main><h1>Laporan</h1><PeriodForm current={p.key} from={p.from} to={p.to} extra={<select name="r" defaultValue={r}>{Object.entries(REPORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>} />
    <p><small>Pembayaran utang tidak dihitung ke laporan kategori agar tidak ganda; transfer tidak dihitung sebagai pemasukan/pengeluaran.</small></p><div className="card">{body}</div></main>);
}
