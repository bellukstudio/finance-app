import { getCtx, canManage } from "@/lib/context";
import { todayJakarta } from "@/lib/period";
import { BudgetManager, type BudgetView } from "@/components/budget-manager";

export default async function Page({ searchParams }: { searchParams: Promise<{ history?: string }> }) {
  const { history } = await searchParams;
  const { sb, role } = await getCtx();
  const today = todayJakarta();
  const [{ data: bs }, { data: usage }, { data: bw }, { data: bc }, { data: ws }, { data: cats }] = await Promise.all([
    sb.from("budgets").select("id,name,scope,category_id,wallet_id,start_date,end_date,amount").is("deleted_at", null).order("start_date", { ascending: false }).order("created_at"),
    sb.from("budget_usage").select("budget_id,used,topup"), sb.from("budget_wallets").select("budget_id,wallet_id"), sb.from("budget_categories").select("budget_id,category_id"),
    sb.from("wallets").select("id,name").eq("is_active", true).is("deleted_at", null).order("name"),
    sb.from("categories").select("id,name").eq("type", "expense").eq("is_active", true).is("deleted_at", null).order("name")]);
  const cn = new Map((cats ?? []).map((c) => [c.id, c.name])), wn = new Map((ws ?? []).map((w) => [w.id, w.name]));
  const u = new Map((usage ?? []).map((x) => [x.budget_id, x]));
  const group = (rows: { budget_id: string }[] | null, key: "wallet_id" | "category_id") => { const m = new Map<string, string[]>(); (rows as unknown as Record<string, string>[] | null ?? []).forEach((r) => m.set(r.budget_id, [...(m.get(r.budget_id) ?? []), r[key]])); return m; };
  const wm = group(bw, "wallet_id"), cm = group(bc, "category_id");
  const list: BudgetView[] = (bs ?? []).filter((b) => (history ? b.end_date < today : b.end_date >= today)).map((b) => {
    const x = u.get(b.id), start = b.start_date, [y, m] = start.split("-").map(Number);
    return { id: b.id, name: b.name || (b.category_id && cn.get(b.category_id)) || (b.wallet_id && wn.get(b.wallet_id)) || "Budget", amount: Number(b.amount), used: Number(x?.used ?? 0), topup: Number(x?.topup ?? 0), start, end: b.end_date, month: m, year: y,
      wallet_ids: wm.get(b.id) ?? [], category_ids: cm.get(b.id) ?? [],
      ...(b.scope === "multi" ? {} : { wallet_ids: b.scope === "wallet" && b.wallet_id ? [b.wallet_id] : wm.get(b.id) ?? [], category_ids: b.scope === "category" && b.category_id ? [b.category_id] : cm.get(b.id) ?? [] }) };
  });
  return <BudgetManager budgets={list} wallets={ws ?? []} cats={cats ?? []} canEdit={canManage(role)} history={!!history} today={today} />;
}
