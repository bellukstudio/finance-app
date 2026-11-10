import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
export async function getCtx() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await sb.from("family_members").select("family_id,role").eq("user_id", user.id).is("deleted_at", null).limit(1).maybeSingle();
  if (!m) redirect("/dashboard");
  return { sb, user, familyId: m.family_id, role: m.role as "owner" | "admin" | "member" | "viewer" };
}
export const canManage = (r: string) => r === "owner" || r === "admin";
export const canWrite = (r: string) => r !== "viewer";
export const back = (path: string, msg?: string | null): never =>
  redirect(msg ? `${path}?e=${encodeURIComponent(msg)}` : path);
