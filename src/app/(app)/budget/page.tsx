import { getCtx, canManage } from "@/lib/context";
import { todayJakarta } from "@/lib/period";
import { BudgetManager, type BudgetTx, type BudgetView } from "@/components/budget-manager";

export default async function Page({ searchParams }: { searchParams: Promise<{ history?: string }> }) {
  const { history } = await searchParams;
  const { sb, role, familyId } = await getCtx();
  const today = todayJakarta();
  const [{ data: bs }, { data: usage }, { data: bw }, { data: bc }, { data: ws }, { data: cats }, { data: allWs }, { data: allCats }] = await Promise.all([
    sb.from("budgets").select("id,name,scope,category_id,wallet_id,start_date,end_date,amount").eq("family_id", familyId).is("deleted_at", null).order("start_date", { ascending: false }).order("created_at"),
    sb.from("budget_usage").select("budget_id,used,topup").eq("family_id", familyId), sb.from("budget_wallets").select("budget_id,wallet_id").eq("family_id", familyId), sb.from("budget_categories").select("budget_id,category_id").eq("family_id", familyId),
    sb.from("wallets").select("id,name").eq("family_id", familyId).eq("is_active", true).is("deleted_at", null).order("name"),
    sb.from("categories").select("id,name").eq("family_id", familyId).eq("type", "expense").eq("is_active", true).is("deleted_at", null).order("name"),
    sb.from("wallets").select("id,name").eq("family_id", familyId).is("deleted_at", null),
    sb.from("categories").select("id,name").eq("family_id", familyId).is("deleted_at", null)]);
  const cn = new Map((cats ?? []).map((c) => [c.id, c.name])), wn = new Map((ws ?? []).map((w) => [w.id, w.name]));
  const u = new Map((usage ?? []).map((x) => [x.budget_id, x]));
  const group = (rows: Record<string, string>[] | null, key: "wallet_id" | "category_id") => { const m = new Map<string, string[]>(); (rows ?? []).forEach((r) => { const b = r.budget_id, v = r[key]; if (b && v) m.set(b, [...(m.get(b) ?? []), v]); }); return m; };
  const wm = group(bw, "wallet_id"), cm = group(bc, "category_id");
  const list: BudgetView[] = (bs ?? []).filter((b) => (history ? b.end_date < today : b.end_date >= today)).map((b) => {
    const x = u.get(b.id), start = b.start_date, [y, m] = start.split("-").map(Number);
    return { id: b.id, name: b.name || (b.category_id && cn.get(b.category_id)) || (b.wallet_id && wn.get(b.wallet_id)) || "Budget", amount: Number(b.amount), used: Number(x?.used ?? 0), topup: Number(x?.topup ?? 0), start, end: b.end_date, month: m, year: y,
      tx_ids: [], wallet_ids: wm.get(b.id) ?? [], category_ids: cm.get(b.id) ?? [],
      ...(b.scope === "multi" ? {} : { wallet_ids: b.scope === "wallet" && b.wallet_id ? [b.wallet_id] : wm.get(b.id) ?? [], category_ids: b.scope === "category" && b.category_id ? [b.category_id] : cm.get(b.id) ?? [] }) };
  });
  // Transaksi yang terhubung ke budget — aturannya sama dengan view budget_usage:
  //  • pengeluaran ber-budget_id  → hanya budget itu
  //  • pengeluaran tanpa budget_id → budget yang wallet, kategori & periodenya cocok (daftar kosong = semua)
  //  • transfer ber-budget_id      → menambah budget (top-up)
  let txs: BudgetTx[] = [];
  if (list.length) {
    const lo = list.reduce((a, b) => (b.start < a ? b.start : a), list[0].start), hi = list.reduce((a, b) => (b.end > a ? b.end : a), list[0].end);
    const ids = list.map((b) => b.id).join(",");
    const { data } = await sb.from("transactions").select("id,date,type,amount,description,note,wallet_id,to_wallet_id,category_id,budget_id")
      .eq("family_id", familyId).is("deleted_at", null).in("type", ["expense", "transfer"])
      .or(`and(date.gte.${lo},date.lte.${hi}),budget_id.in.(${ids})`)
      .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(2000);
    txs = (data ?? []) as BudgetTx[];
    const hit = (b: BudgetView, t: BudgetTx) => t.type === "transfer" ? t.budget_id === b.id
      : t.type === "expense" && (t.budget_id === b.id || (!t.budget_id && t.date >= b.start && t.date <= b.end
        && (!b.wallet_ids.length || b.wallet_ids.includes(t.wallet_id)) && (!b.category_ids.length || (!!t.category_id && b.category_ids.includes(t.category_id)))));
    for (const b of list) b.tx_ids = txs.filter((t) => hit(b, t)).map((t) => t.id);
  }
  return <BudgetManager budgets={list} transactions={txs} walletNames={allWs ?? []} catNames={allCats ?? []} wallets={ws ?? []} cats={cats ?? []} canEdit={canManage(role)} history={!!history} today={today} />;
}
