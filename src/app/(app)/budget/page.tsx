import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { budgetPercent, budgetStatus, STATUS_LABEL } from "@/lib/budget";
import { budgetRange, todayJakarta } from "@/lib/period";

const B = z.object({ scope: z.enum(["category","wallet"]), category_id: z.string().uuid().optional().or(z.literal("")), wallet_id: z.string().uuid().optional().or(z.literal("")),
  period_type: z.enum(["weekly","monthly","yearly","custom"]), ref: z.string().date(), end: z.string().date().optional().or(z.literal("")), amount: z.coerce.number().positive() });

async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canManage(role)) return back("/budget", "Hanya Owner/Admin.");
  const p = B.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/budget", "Input tidak valid.");
  const v = p.data;
  const target = v.scope === "category" ? v.category_id : v.wallet_id;
  if (!target) return back("/budget", v.scope === "category" ? "Pilih kategori." : "Pilih dompet.");
  let start = v.ref, end = v.end || "";
  if (v.period_type !== "custom") ({ start, end } = budgetRange(v.period_type, v.ref));
  if (!end || end < start) return back("/budget", "Tanggal akhir tidak valid.");
  const { error } = await sb.from("budgets").insert({ family_id: familyId, scope: v.scope, category_id: v.scope === "category" ? target : null, wallet_id: v.scope === "wallet" ? target : null,
    period_type: v.period_type, start_date: start, end_date: end, amount: v.amount, created_by: user.id });
  revalidatePath("/budget"); back("/budget", pgMessage(error));
}
async function remove(fd: FormData) {
  "use server";
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return back("/budget", "Hanya Owner/Admin.");
  const { error } = await sb.from("budgets").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", String(fd.get("id")));
  revalidatePath("/budget"); back("/budget", pgMessage(error));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; history?: string }> }) {
  const { e, history } = await searchParams;
  const { sb, role } = await getCtx();
  const today = todayJakarta();
  const [{ data: bs }, { data: usage }, { data: cats }, { data: ws }] = await Promise.all([
    sb.from("budgets").select("id,scope,category_id,wallet_id,period_type,start_date,end_date,amount").is("deleted_at", null).order("start_date", { ascending: false }),
    sb.from("budget_usage").select("budget_id,used"),
    sb.from("categories").select("id,name").eq("type", "expense").eq("is_active", true).is("deleted_at", null), sb.from("wallets").select("id,name").is("deleted_at", null)]);
  const used = new Map(usage?.map(u => [u.budget_id, Number(u.used)]));
  const cn = new Map(cats?.map(c => [c.id, c.name])), wn = new Map(ws?.map(w => [w.id, w.name]));
  const list = (bs ?? []).filter(b => history ? b.end_date < today : b.end_date >= today);
  return (<main><h1>Budget</h1>{e && <p role="alert">{e}</p>}
    <p><small>Budget kategori dan budget dompet adalah dua sudut pandang atas transaksi pengeluaran yang sama. Satu pengeluaran dihitung sekali di tiap budget, dan tidak dijumlahkan dua kali. Transfer tidak memengaruhi budget.</small></p>
    {canManage(role) && <form action={create}>
      <select name="scope"><option value="category">Per kategori</option><option value="wallet">Per dompet</option></select>
      <select name="category_id"><option value="">Kategori…</option>{cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select name="wallet_id"><option value="">Dompet…</option>{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <select name="period_type"><option value="monthly">Bulanan</option><option value="weekly">Mingguan</option><option value="yearly">Tahunan</option><option value="custom">Kustom</option></select>
      <input type="date" name="ref" defaultValue={today} required /><input type="date" name="end" title="Akhir (khusus kustom)" />
      <input name="amount" type="number" step="0.01" placeholder="Nilai anggaran" required /><button>Buat budget</button></form>}
    <p><a href="/budget">Aktif</a> | <a href="?history=1">Riwayat</a></p>
    {!list.length ? <p>Belum ada budget.</p> : <ul>{list.map(b => { const u = used.get(b.id) ?? 0, a = Number(b.amount), st = budgetStatus(u, a);
      return <li key={b.id}><b>{b.scope === "category" ? cn.get(b.category_id!) : wn.get(b.wallet_id!)}</b> ({b.period_type}, {tanggal(b.start_date)}–{tanggal(b.end_date)}) — anggaran {rupiah(a)}, terpakai {rupiah(u)}, sisa {rupiah(a - u)}, {budgetPercent(u, a).toFixed(0)}% · <b>{STATUS_LABEL[st]}</b>
        {canManage(role) && <form action={remove} style={{ display: "inline" }}><input type="hidden" name="id" value={b.id} /> <button>Hapus</button></form>}</li>; })}</ul>}</main>);
}
