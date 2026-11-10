import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah } from "@/lib/format";

const W = z.object({ name: z.string().trim().min(1).max(60), kind: z.enum(["cash","bank","ewallet","savings","investment","credit_card","other"]),
  initial_balance: z.coerce.number().default(0), color: z.string().max(20).optional(), description: z.string().max(200).optional() });
const KIND: Record<string, string> = { cash: "Cash", bank: "Bank Account", ewallet: "E-Wallet", savings: "Savings", investment: "Investment", credit_card: "Credit Card", other: "Other" };

async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canManage(role)) return back("/dompet", "Hanya Owner/Admin yang dapat membuat dompet.");
  const p = W.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/dompet", "Input tidak valid.");
  const { error } = await sb.from("wallets").insert({ ...p.data, family_id: familyId, created_by: user.id });
  revalidatePath("/dompet"); back("/dompet", pgMessage(error));
}
async function toggle(fd: FormData) {
  "use server";
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return back("/dompet", "Tidak ada izin.");
  const { error } = await sb.from("wallets").update({ is_active: fd.get("active") !== "true", updated_by: user.id }).eq("id", String(fd.get("id")));
  revalidatePath("/dompet"); back("/dompet", pgMessage(error));
}
async function remove(fd: FormData) {
  "use server";
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return back("/dompet", "Tidak ada izin.");
  const { error } = await sb.from("wallets").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", String(fd.get("id")));
  revalidatePath("/dompet"); back("/dompet", pgMessage(error));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role } = await getCtx();
  const [{ data: bal }, { data: ws }] = await Promise.all([sb.from("wallet_balances").select("wallet_id,balance"), sb.from("wallets").select("*").is("deleted_at", null).order("name")]);
  const b = new Map(bal?.map(x => [x.wallet_id, Number(x.balance)]));
  const total = (ws ?? []).reduce((a, w) => a + (b.get(w.id) ?? 0), 0);
  return (<main>
    <div className="head"><div><h1>Dompet</h1><small>Total saldo {rupiah(total)}</small></div></div>
    {e && <p role="alert">{e}</p>}
    {canManage(role) && <form action={create}><input name="name" placeholder="Nama dompet" required />
      <select name="kind">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input name="initial_balance" type="number" step="0.01" placeholder="Saldo awal" defaultValue={0} /><input name="description" placeholder="Deskripsi" /><button>Tambah</button></form>}
    {!ws?.length ? <p className="muted">Belum ada dompet.</p> : <div className="cards">{ws.map(w => <article key={w.id} className="card" style={w.is_active ? undefined : { opacity: 0.6 }}>
      <div className="between"><b>{w.name}</b><span className="pill">{KIND[w.kind]}{w.is_active ? "" : " · nonaktif"}</span></div>
      <div className="big2">{rupiah(b.get(w.id) ?? 0)}</div>
      {canManage(role) && <div className="tx-actions"><form action={toggle}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="active" value={String(w.is_active)} /><button className="ghost">{w.is_active ? "Nonaktifkan" : "Aktifkan"}</button></form>
        <form action={remove}><input type="hidden" name="id" value={w.id} /><button className="danger">Hapus</button></form></div>}</article>)}</div>}
  </main>);
}
