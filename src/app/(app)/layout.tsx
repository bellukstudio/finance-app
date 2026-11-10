import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";
async function signOut() { "use server"; const sb = await supabaseServer(); await sb.auth.signOut(); redirect("/login"); }
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return <AppNav unread={count ?? 0} signOut={signOut}>{children}</AppNav>;
}
