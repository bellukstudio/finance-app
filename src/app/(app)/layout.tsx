import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";
import { todayJakarta } from "@/lib/period";
async function signOut() { "use server"; const sb = await supabaseServer(); await sb.auth.signOut(); redirect("/login"); }
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const today = todayJakarta(), from = new Date(Date.parse(today) - 62 * 86400000).toISOString().slice(0, 10);
  const [{ count }, { data: ws }, { data: cs }, { data: bs }] = await Promise.all([
    sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    sb.from("wallets").select("id,name").eq("is_active", true).is("deleted_at", null).order("name"),
    sb.from("categories").select("id,name,type").eq("is_active", true).is("deleted_at", null).order("name"),
    sb.from("budgets").select("id,name,scope,category_id,wallet_id,start_date,end_date").is("deleted_at", null).gte("end_date", from)
  ]);
  const cn = new Map((cs ?? []).map((c) => [c.id, c.name])), wn = new Map((ws ?? []).map((w) => [w.id, w.name]));
  const budgets = (bs ?? []).map((b) => ({ id: b.id, start: b.start_date, end: b.end_date,
    name: b.name || (b.category_id ? cn.get(b.category_id) : b.wallet_id ? wn.get(b.wallet_id) : null) || "Budget" }));
  return <AppNav unread={count ?? 0} signOut={signOut} wallets={ws ?? []} cats={cs ?? []} budgets={budgets}>{children}</AppNav>;
}
