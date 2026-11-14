import { getCtx } from "@/lib/context";
import { rupiah, tanggal } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { budgetStatus, STATUS_LABEL } from "@/lib/budget";
import { DataTable, type DTRow } from "@/components/data-table";
import { PeriodForm } from "@/components/period-form";
import { CategoryPie, IncomeExpenseChart, WalletBars } from "@/components/charts";

const REPORTS = { cashflow: "Income vs Expense / Cash Flow", expense_cat: "Expense by Category", income_cat: "Income by Category", wallet: "Wallet Balance", budget: "Budget Performance" } as const;
type Key = keyof typeof REPORTS; type Row = Record<string, string | number>;

export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string; period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const r: Key = sp.r && sp.r in REPORTS ? (sp.r as Key) : "cashflow";
  const { sb, familyId, ledger } = await getCtx();
  const p = resolvePeriod(sp.period, sp.from, sp.to);
  let body: React.ReactNode = null;
  if (r === "cashflow") {
    const { data } = await sb.rpc("report_series", { fid: familyId, d_from: p.from, d_to: p.to, grain: p.key === "year" ? "month" : "day" });
    const rows = ((data ?? []) as Row[]).map(x => ({ label: tanggal(String(x.bucket)), income: Number(x.income), expense: Number(x.expense) }));
    body = <><IncomeExpenseChart data={rows} /><DataTable label="Arus kas" rows={rows.map((x, i): DTRow => { const net = x.income - x.expense; return { id: String(i), search: x.label, sort: { label: i, income: x.income, expense: x.expense, net },
      cells: { label: x.label, income: <span className="inc">{rupiah(x.income)}</span>, expense: <span className="exp">{rupiah(x.expense)}</span>, net: <span className={net >= 0 ? "inc" : "exp"}>{rupiah(net)}</span> } }; })}
      empty="Belum ada data pada periode ini." defaultSort={{ key: "label", dir: "asc" }} pageSize={15}
      columns={[{ key: "label", header: "Periode", sortable: true }, { key: "income", header: "Masuk", align: "right", sortable: true }, { key: "expense", header: "Keluar", align: "right", sortable: true }, { key: "net", header: "Arus kas", align: "right", sortable: true }]} /></>;
  } else if (r === "expense_cat" || r === "income_cat") {
    const { data } = await sb.rpc("report_by_category", { fid: familyId, d_from: p.from, d_to: p.to, t: r === "expense_cat" ? "expense" : "income" });
    const rows = ((data ?? []) as Row[]).map(x => ({ name: String(x.name), value: Number(x.total) }));
    const sum = rows.reduce((a, x) => a + x.value, 0);
    body = <><CategoryPie data={rows} /><DataTable label="Laporan per kategori" empty="Belum ada data pada periode ini." defaultSort={{ key: "value", dir: "desc" }}
      rows={rows.map((x, i): DTRow => ({ id: String(i), search: x.name, sort: { name: x.name, value: x.value, pct: sum ? x.value / sum : 0 }, cells: { name: x.name, value: rupiah(x.value), pct: `${sum ? ((x.value / sum) * 100).toFixed(1) : "0.0"}%` } }))}
      columns={[{ key: "name", header: "Kategori", sortable: true }, { key: "value", header: "Total", align: "right", sortable: true }, { key: "pct", header: "Porsi", align: "right", sortable: true }]} /></>;
  } else if (r === "wallet") {
    const { data } = await sb.from("wallet_balances").select("name,balance").eq("family_id", familyId);
    const rows = (data ?? []).map(w => ({ name: w.name, value: Number(w.balance) }));
    body = <><WalletBars data={rows} /><DataTable label="Saldo dompet" empty="Belum ada dompet." defaultSort={{ key: "name", dir: "asc" }}
      rows={rows.map((x, i): DTRow => ({ id: String(i), search: x.name, sort: { name: x.name, value: x.value }, cells: { name: x.name, value: <span className={x.value >= 0 ? "inc" : "exp"}>{rupiah(x.value)}</span> } }))}
      columns={[{ key: "name", header: "Dompet", sortable: true }, { key: "value", header: "Saldo", align: "right", sortable: true }]} /></>;
  } else {
    const [{ data: u }, { data: bs }, { data: cats }, { data: ws }] = await Promise.all([
      sb.from("budget_usage").select("budget_id,budget,used,topup").eq("family_id", familyId).lte("start_date", p.to).gte("end_date", p.from),
      sb.from("budgets").select("id,name,scope,category_id,wallet_id").eq("family_id", familyId), sb.from("categories").select("id,name").eq("family_id", familyId), sb.from("wallets").select("id,name").eq("family_id", familyId)]);
    const m = new Map(bs?.map(b => [b.id, b])), cn = new Map(cats?.map(c => [c.id, c.name])), wn = new Map(ws?.map(w => [w.id, w.name]));
    const rows: DTRow[] = (u ?? []).map(x => { const b = m.get(x.budget_id), total = Number(x.budget) + Number(x.topup ?? 0), used = Number(x.used), st = STATUS_LABEL[budgetStatus(used, total)];
      const name = String(b?.name || (b?.category_id && cn.get(b.category_id)) || (b?.wallet_id && wn.get(b.wallet_id)) || "Budget");
      return { id: x.budget_id, search: `${name} ${st}`, sort: { name, total, used, st },
        cells: { name, total: <>{rupiah(total)}{Number(x.topup) > 0 && <small className="muted"> (+{rupiah(Number(x.topup))} transfer)</small>}</>, used: rupiah(used), st: <span className="pill">{st}</span> } }; });
    body = <DataTable label="Performa budget" rows={rows} empty="Tidak ada budget pada periode ini." defaultSort={{ key: "name", dir: "asc" }}
      columns={[{ key: "name", header: "Budget", sortable: true }, { key: "total", header: "Anggaran", align: "right", sortable: true }, { key: "used", header: "Terpakai", align: "right", sortable: true }, { key: "st", header: "Status", sortable: true }]} />;
  }
  return (<main><h1>{ledger === "personal" ? "Laporan Pribadi" : "Laporan"}</h1><PeriodForm action="/laporan" current={p.key} from={p.from} to={p.to} extra={<select name="r" defaultValue={r}>{Object.entries(REPORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>} />
    <p><small>Pembayaran utang tidak dihitung ke laporan kategori agar tidak ganda; transfer tidak dihitung sebagai pemasukan/pengeluaran.</small></p><div className="card">{body}</div></main>);
}
