import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { tanggal } from "@/lib/format";
import { getOrigin } from "@/lib/origin";
import { DataTable, type DTRow } from "@/components/data-table";

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
  const memberRows: DTRow[] = (ms ?? []).map(m => { const nm = pn.get(m.user_id) ?? m.user_id;
    return { id: m.user_id, search: `${nm} ${m.role}`, sort: { name: nm, role: m.role }, cells: { name: <span className="strong">{nm}{m.user_id === user.id && <small className="muted"> (Anda)</small>}</span>, role: <span className="pill">{m.role}</span>,
      act: <div className="acts">{role === "owner" && m.role !== "owner" && <form action={changeRole}><input type="hidden" name="uid" value={m.user_id} /><select name="r" defaultValue={m.role} aria-label="Role">{ROLES.map(r => <option key={r}>{r}</option>)}</select><button className="ghost sm">Ubah role</button></form>}
        {canManage(role) && m.role !== "owner" && <form action={removeMember}><input type="hidden" name="uid" value={m.user_id} /><button className="danger sm" data-confirm="Anggota ini tidak akan bisa lagi mengakses data keluarga." data-confirm-title="Keluarkan anggota ini?" data-confirm-label="Keluarkan">Keluarkan</button></form>}</div> } }; });
  const invRows: DTRow[] = (inv ?? []).map(i => ({ id: i.id, search: `${i.role} ${tanggal(i.expires_at)}`, sort: { role: i.role, exp: i.expires_at }, cells: { role: <span className="pill">{i.role}</span>, exp: tanggal(i.expires_at),
    act: <form action={revoke}><input type="hidden" name="id" value={i.id} /><button className="danger sm" data-confirm="Link undangan ini tidak bisa dipakai lagi." data-confirm-title="Cabut undangan ini?" data-confirm-label="Cabut">Cabut</button></form> } }));
  return (<main><h1>Anggota Keluarga</h1>{e && <p role="status" style={{ wordBreak: "break-all" }}>{e}</p>}
    <DataTable label="Anggota keluarga" rows={memberRows} empty="Belum ada anggota."
      columns={[{ key: "name", header: "Nama", sortable: true }, { key: "role", header: "Role", sortable: true }, ...(canManage(role) ? [{ key: "act", header: "Aksi" }] : [])]} />
    {canManage(role) && <><h2>Undang anggota</h2><form action={invite}><select name="role">{ROLES.map(r => <option key={r}>{r}</option>)}</select><button>Buat link undangan</button></form>
      <h2 className="sec">Undangan aktif</h2>
      <DataTable label="Undangan aktif" rows={invRows} empty="Tidak ada undangan aktif."
        columns={[{ key: "role", header: "Role", sortable: true }, { key: "exp", header: "Berlaku sampai", sortable: true }, { key: "act", header: "Aksi" }]} /></>}</main>);
}
