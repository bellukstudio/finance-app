import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "member" | "viewer";
/** "family" = catatan keluarga bersama, "personal" = catatan pribadi Owner. */
export type Ledger = "family" | "personal";
export const LEDGER_COOKIE = "ledger";

type Membership = { family_id: string; role: Role; kind: Ledger; name: string };
type FamilyRef = { kind: Ledger; name: string | null; deleted_at: string | null };
type Row = { family_id: string; role: Role; families: FamilyRef | FamilyRef[] | null };
/** Satu pilihan catatan di pengalih: `key` = "personal" atau id grup keluarga. */
export type LedgerOpt = { key: string; label: string; kind: Ledger; role: Role | null; active: boolean };

/**
 * Konteks aktif. Seluruh query data HARUS memfilter `family_id = familyId`, karena satu user bisa punya akses RLS
 * ke banyak "family" (grup keluarga yang diikuti + catatan pribadi). Cookie `ledger` (isi: "personal" atau id grup)
 * hanya preferensi tampilan; hak akses tetap ditentukan RLS dan cookie divalidasi terhadap keanggotaan user.
 * Cookie palsu tidak berefek karena nilainya hanya dipakai bila cocok dengan keanggotaan milik user itu sendiri.
 */
const getAuth = cache(async () => {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
});

async function fetchMemberships(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string): Promise<Membership[]> {
  const { data } = await sb.from("family_members").select("family_id,role,created_at,families!inner(kind,name,deleted_at)")
    .eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: true });
  return ((data ?? []) as unknown as Row[]).flatMap((m): Membership[] => {
    const f = Array.isArray(m.families) ? m.families[0] : m.families;
    if (!f || f.deleted_at) return [];
    return [{ family_id: m.family_id, role: m.role, kind: f.kind, name: f.name?.trim() || "Keluarga" }];
  });
}
const getMemberships = cache(async (): Promise<Membership[]> => {
  const { sb, user } = await getAuth();
  return user ? fetchMemberships(sb, user.id) : [];
});

export const getOptionalCtx = cache(async () => {
  const { sb, user } = await getAuth();
  if (!user) return null;

  // Selalu query data terbaru dari database untuk mencegah stale cache setelah switch ke personal
  // atau setelah membuat/menampilkan catatan pribadi pada mobile. Cache hanya perlu membatasi
  // panggilan dalam satu request, bukan menyimpan lebih lama dari itu.
  const ms = await fetchMemberships(sb, user.id);
  const groups = ms.filter((m) => m.kind === "family");
  const personal = ms.find((m) => m.kind === "personal" && m.role === "owner");
  const first = groups[0] ?? personal ?? null;
  if (!first) return null; // belum punya grup & belum punya catatan pribadi

  const want = (await cookies()).get(LEDGER_COOKIE)?.value;
  const preferredFamily = want && want !== "personal" ? groups.find((g) => g.family_id === want) ?? null : null;
  const active = want === "personal" && personal ? personal : preferredFamily ?? personal ?? groups[0];
  const ledgers: LedgerOpt[] = [
    { key: "personal", label: "Catatan pribadi", kind: "personal", role: personal ? "owner" : null, active: active === personal },
    ...groups.map((g): LedgerOpt => ({ key: g.family_id, label: g.name, kind: "family", role: g.role, active: g === active })),
  ];
  return {
    sb, user, familyId: active.family_id, role: active.role, ledger: active.kind, ledgerName: active.name, ledgers,
    /** Setiap user yang sudah punya grup boleh punya catatan pribadi sendiri (dibuat saat pertama dibuka). */
    canPersonal: true,
    sharedFamilyId: (active.kind === "family" ? active : (groups[0] ?? active)).family_id,
  };
});

/** Grup keluarga yang paling baru diikuti/dibuat user. Selalu query ulang (tidak memakai cache request) agar akurat setelah membuat/menerima grup. */
export async function latestGroupId(): Promise<string | null> {
  const { sb, user } = await getAuth();
  if (!user) return null;
  const groups = (await fetchMemberships(sb, user.id)).filter((m) => m.kind === "family");
  return groups[groups.length - 1]?.family_id ?? null;
}

/** Simpan pilihan catatan aktif: "personal" atau id grup. */
export async function setLedgerCookie(value: string) {
  (await cookies()).set(LEDGER_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

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
