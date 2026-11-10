import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "member" | "viewer";
/** "family" = catatan keluarga bersama, "personal" = catatan pribadi Owner. */
export type Ledger = "family" | "personal";
export const LEDGER_COOKIE = "ledger";

type Membership = { family_id: string; role: Role; kind: Ledger };
type FamilyRef = { kind: Ledger; deleted_at: string | null };
type Row = { family_id: string; role: Role; families: FamilyRef | FamilyRef[] | null };

/**
 * Konteks aktif. Seluruh query data HARUS memfilter `family_id = familyId`, karena seorang Owner punya akses RLS
 * ke dua "family" (keluarga + pribadi). Cookie `ledger` hanya preferensi tampilan; hak akses tetap ditentukan RLS.
 * Cookie palsu oleh non-Owner tidak berefek karena ia tidak punya keanggotaan pada catatan pribadi.
 */
const getAuth = cache(async () => {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
});

export const getOptionalCtx = cache(async () => {
  const { sb, user } = await getAuth();
  if (!user) return null;

  const { data } = await sb
    .from("family_members")
    .select("family_id,role,created_at,families!inner(kind,deleted_at)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const ms = ((data ?? []) as unknown as Row[]).flatMap((m): Membership[] => {
    const f = Array.isArray(m.families) ? m.families[0] : m.families;
    if (!f || f.deleted_at) return [];
    return [{ family_id: m.family_id, role: m.role, kind: f.kind }];
  });

  const shared = ms.find((m) => m.kind === "family");
  if (!shared) return null;
  const personal = ms.find((m) => m.kind === "personal" && m.role === "owner");
  const store = await cookies();
  const active = store.get(LEDGER_COOKIE)?.value === "personal" && personal ? personal : shared;

  return {
    sb, user, familyId: active.family_id, role: active.role, ledger: active.kind,
    /** Hanya Owner keluarga yang boleh membuka catatan pribadi. */
    canPersonal: shared.role === "owner",
    sharedFamilyId: shared.family_id,
  };
});

export async function getCtx() {
  const c = await getOptionalCtx();
  if (c) return c;
  if (!(await getAuth()).user) redirect("/login");
  redirect("/dashboard"); // belum punya keluarga: dashboard menampilkan form pembuatan
}

export const canManage = (r: string) => r === "owner" || r === "admin";
export const canWrite = (r: string) => r !== "viewer";
export const back = (path: string, msg?: string | null): never =>
  redirect(msg ? `${path}?e=${encodeURIComponent(msg)}` : path);