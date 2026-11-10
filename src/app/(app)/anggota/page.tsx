import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { tanggal } from "@/lib/format";
import { getOrigin } from "@/lib/origin";

const ROLES = ["admin", "member", "viewer"] as const;
async function invite(fd: FormData) {
  "use server";
  const { sb, user, familyId, role, ledger } = await getCtx();
  if (ledger === "personal") return back("/dashboard", "Catatan pribadi tidak dapat dibagikan.");
  if (!canManage(role)) return back("/anggota", "Hanya Owner/Admin.");
  if (!(await rateLimit(sb, "invite", 10, 3600))) return back("/anggota", "Terlalu banyak undangan, coba lagi nanti.");
  const r = z.enum(ROLES).safeParse(fd.get("role")); if (!r.success) return back("/anggota", "Role tidak valid.");
  const { data, error } = await sb.rpc("create_invitation", { fid: familyId, r: r.data });
  if (error) return back("/anggota", pgMessage(error));
  const link = `${await getOrigin()}/undangan/${data}`;
  revalidatePath("/anggota"); return back("/anggota", `Link undangan (berlaku 7 hari, sekali pakai): ${link}`);
}
async function changeRole(fd: FormData) {
  "use server";
  const { sb, familyId, ledger } = await getCtx();
  if (ledger === "personal") return back("/dashboard", "Catatan pribadi tidak memiliki anggota.");
  const p = z.object({ uid: z.string().uuid(), r: z.enum(ROLES) }).safeParse(Object.fromEntries(fd)); if (!p.success) return back("/anggota", "Input tidak valid.");
  const { error } = await sb.rpc("change_member_role", { fid: familyId, uid: p.data.uid, r: p.data.r });
  revalidatePath("/anggota"); back("/anggota", pgMessage(error));
}
async function removeMember(fd: FormData) {
  "use server";
  const { sb, familyId, ledger } = await getCtx();
  if (ledger === "personal") return back("/dashboard", "Catatan pribadi tidak memiliki anggota.");
  const { error } = await sb.rpc("remove_member", { fid: familyId, uid: String(fd.get("uid")) });
  revalidatePath("/anggota"); back("/anggota", pgMessage(error));
}
async function revoke(fd: FormData) {
  "use server";
  const { sb, role, familyId } = await getCtx(); if (!canManage(role)) return back("/anggota", "Hanya Owner/Admin.");
  const { error } = await sb.from("family_invitations").update({ status: "revoked" }).eq("id", String(fd.get("id"))).eq("family_id", familyId);
  revalidatePath("/anggota"); back("/anggota", pgMessage(error));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams; void headers;
  const { sb, user, role, familyId, ledger } = await getCtx();
  if (ledger === "personal") return (<main><h1>Catatan Pribadi</h1><p>Catatan pribadi hanya dapat dilihat dan diakses oleh Anda sebagai Owner. Tidak ada anggota atau undangan di sini.</p></main>);
  const [{ data: ms }, { data: ps }, { data: inv }] = await Promise.all([sb.from("family_members").select("user_id,role,created_at").eq("family_id", familyId).is("deleted_at", null),
    sb.from("profiles").select("id,full_name"), sb.from("family_invitations").select("id,role,expires_at").eq("family_id", familyId).eq("status", "pending").gt("expires_at", new Date().toISOString())]);
  const pn = new Map(ps?.map(p => [p.id, p.full_name]));
  return (<main><h1>Anggota Keluarga</h1>{e && <p role="status" style={{ wordBreak: "break-all" }}>{e}</p>}
    <ul>{ms?.map(m => <li key={m.user_id}>{pn.get(m.user_id) ?? m.user_id} — <b>{m.role}</b> {m.user_id === user.id && "(Anda)"}
      {role === "owner" && m.role !== "owner" && <form action={changeRole} style={{ display: "inline" }}> <input type="hidden" name="uid" value={m.user_id} /><select name="r" defaultValue={m.role}>{ROLES.map(r => <option key={r}>{r}</option>)}</select><button>Ubah role</button></form>}
      {canManage(role) && m.role !== "owner" && <form action={removeMember} style={{ display: "inline" }}> <input type="hidden" name="uid" value={m.user_id} /><button data-confirm="Anggota ini tidak akan bisa lagi mengakses data keluarga." data-confirm-title="Keluarkan anggota ini?" data-confirm-label="Keluarkan">Keluarkan</button></form>}</li>)}</ul>
    {canManage(role) && <><h2>Undang anggota</h2><form action={invite}><select name="role">{ROLES.map(r => <option key={r}>{r}</option>)}</select><button>Buat link undangan</button></form>
      <h3>Undangan aktif</h3><ul>{inv?.map(i => <li key={i.id}>{i.role}, berlaku sampai {tanggal(i.expires_at)} <form action={revoke} style={{ display: "inline" }}><input type="hidden" name="id" value={i.id} /><button data-confirm="Link undangan ini tidak bisa dipakai lagi." data-confirm-title="Cabut undangan ini?" data-confirm-label="Cabut">Cabut</button></form></li>)}</ul></>}</main>);
}
