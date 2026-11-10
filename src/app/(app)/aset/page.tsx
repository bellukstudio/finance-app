import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { todayJakarta } from "@/lib/period";

const KINDS = ["Cash","Deposito","Emas","Saham","Reksadana","Properti","Kendaraan","Aset lainnya"];
const A = z.object({ name: z.string().trim().min(1).max(80), kind: z.enum(KINDS as [string, ...string[]]), acq: z.coerce.number().min(0), cur: z.coerce.number().min(0), bought: z.string().date().optional().or(z.literal("")), nt: z.string().max(300).optional() });

async function create(fd: FormData) {
  "use server";
  const { sb, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/aset", "Viewer tidak dapat mengubah data.");
  const p = A.safeParse(Object.fromEntries(fd)); if (!p.success) return back("/aset", "Input tidak valid.");
  const v = p.data;
  const { error } = await sb.rpc("create_asset", { fid: familyId, nm: v.name, k: v.kind, acq: v.acq, cur: v.cur, bought: v.bought || null, nt: v.nt ?? null });
  revalidatePath("/aset"); back("/aset", pgMessage(error));
}
async function revalue(fd: FormData) {
  "use server";
  const { sb, role } = await getCtx();
  if (!canWrite(role)) return back("/aset", "Viewer tidak dapat mengubah data.");
  const p = z.object({ id: z.string().uuid(), val: z.coerce.number().min(0), d: z.string().date() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/aset", "Input tidak valid.");
  const { error } = await sb.rpc("update_asset_value", { aid: p.data.id, val: p.data.val, d: p.data.d });
  revalidatePath("/aset"); back("/aset", pgMessage(error));
}
async function remove(fd: FormData) {
  "use server";
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return back("/aset", "Hanya Owner/Admin.");
  const { error } = await sb.from("assets").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", String(fd.get("id")));
  revalidatePath("/aset"); back("/aset", pgMessage(error));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role } = await getCtx();
  const [{ data: as }, { data: vals }] = await Promise.all([sb.from("assets").select("*").is("deleted_at", null).order("name"),
    sb.from("asset_valuations").select("asset_id,value,valued_on").order("valued_on", { ascending: false })]);
  const total = (as ?? []).reduce((a, x) => a + Number(x.current_value), 0);
  return (<main><h1>Aset</h1>{e && <p role="alert">{e}</p>}
    <p><small>Saldo rekening/dompet sudah dihitung di total saldo, jangan dicatat lagi sebagai aset “Cash”.</small></p>
    {canWrite(role) && <form action={create}><input name="name" placeholder="Nama aset" required /><select name="kind">{KINDS.map(k => <option key={k}>{k}</option>)}</select>
      <input name="acq" type="number" step="0.01" placeholder="Nilai perolehan" required /><input name="cur" type="number" step="0.01" placeholder="Nilai saat ini" required />
      <input name="bought" type="date" /><input name="nt" placeholder="Catatan" /><button>Tambah</button></form>}
    <p>Total aset: <b>{rupiah(total)}</b></p>{!as?.length && <p>Belum ada aset.</p>}
    <ul>{as?.map(a => { const h = vals?.filter(v => v.asset_id === a.id) ?? [];
      return <li key={a.id}><b>{a.name}</b> ({a.kind}) — perolehan {rupiah(Number(a.acquisition_value))}, kini {rupiah(Number(a.current_value))} ({Number(a.current_value) - Number(a.acquisition_value) >= 0 ? "+" : ""}{rupiah(Number(a.current_value) - Number(a.acquisition_value))})
        {canWrite(role) && <form action={revalue} style={{ display: "inline" }}> <input type="hidden" name="id" value={a.id} /><input name="val" type="number" step="0.01" placeholder="Nilai baru" required /><input name="d" type="date" defaultValue={todayJakarta()} required /><button>Perbarui nilai</button></form>}
        {canManage(role) && <form action={remove} style={{ display: "inline" }}><input type="hidden" name="id" value={a.id} /> <button>Hapus</button></form>}
        <details><summary>Riwayat nilai ({h.length})</summary><ul>{h.map((v, i) => <li key={i}>{tanggal(v.valued_on)}: {rupiah(Number(v.value))}</li>)}</ul></details></li>; })}</ul></main>);
}
