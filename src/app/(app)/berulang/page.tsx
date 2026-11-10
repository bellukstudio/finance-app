import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, canManage, back } from "@/lib/context";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { todayJakarta } from "@/lib/period";

const FREQ: Record<string, string> = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" };
const R = z.object({ type: z.enum(["income","expense"]), wallet_id: z.string().uuid(), category_id: z.string().uuid(), amount: z.coerce.number().positive(), description: z.string().max(200).optional(),
  frequency: z.enum(["daily","weekly","monthly","yearly"]), interval_n: z.coerce.number().int().min(1).max(365).default(1), start_date: z.string().date(), end_date: z.string().date().optional().or(z.literal("")) });
async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/berulang", "Viewer tidak dapat mengubah data.");
  const p = R.safeParse(Object.fromEntries(fd)); if (!p.success) return back("/berulang", "Input tidak valid.");
  const { data: c } = await sb.from("categories").select("type").eq("id", p.data.category_id).eq("family_id", familyId).single();
  if (c?.type !== p.data.type) return back("/berulang", "Kategori tidak sesuai dengan jenis transaksi.");
  const { error } = await sb.from("recurring_transactions").insert({ ...p.data, end_date: p.data.end_date || null, family_id: familyId, created_by: user.id });
  revalidatePath("/berulang"); back("/berulang", pgMessage(error));
}
async function toggle(fd: FormData) {
  "use server";
  const { sb, user, role, familyId } = await getCtx();
  if (!canWrite(role)) return back("/berulang", "Tidak ada izin.");
  const { error } = await sb.from("recurring_transactions").update({ is_active: fd.get("active") !== "true", updated_by: user.id }).eq("id", String(fd.get("id"))).eq("family_id", familyId);
  revalidatePath("/berulang"); back("/berulang", pgMessage(error));
}
async function runNow() {
  "use server";
  const { role } = await getCtx();
  if (!canManage(role)) return back("/berulang", "Hanya Owner/Admin.");
  const { data, error } = await supabaseAdmin().rpc("run_recurring");  // idempotent
  revalidatePath("/berulang"); back("/berulang", error ? "Gagal menjalankan." : `${data ?? 0} transaksi baru dibuat.`);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role, familyId } = await getCtx();
  const [{ data: rs }, { data: ws }, { data: cats }] = await Promise.all([sb.from("recurring_transactions").select("*").eq("family_id", familyId).is("deleted_at", null).order("start_date"),
    sb.from("wallets").select("id,name").eq("family_id", familyId).eq("is_active", true).is("deleted_at", null), sb.from("categories").select("id,name,type").eq("family_id", familyId).eq("is_active", true).is("deleted_at", null)]);
  const wn = new Map(ws?.map(w => [w.id, w.name])), cn = new Map(cats?.map(c => [c.id, c.name]));
  return (<main><h1>Transaksi Berulang</h1>{e && <p role="status">{e}</p>}
    <p><small>Dijalankan otomatis tiap hari 00:05 WIB (pg_cron). Aman dijalankan berulang: satu tanggal hanya membuat satu transaksi.</small></p>
    {canWrite(role) && <form action={create}><select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
      <select name="wallet_id">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <select name="category_id">{cats?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}</select>
      <input name="amount" type="number" step="0.01" placeholder="Nominal" required /><input name="description" placeholder="Deskripsi" />
      <select name="frequency">{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input name="interval_n" type="number" min={1} defaultValue={1} title="Setiap n periode" />
      <input name="start_date" type="date" defaultValue={todayJakarta()} required /><input name="end_date" type="date" title="Berakhir (opsional)" /><button>Tambah</button></form>}
    {canManage(role) && <form action={runNow}><button>Jalankan sekarang</button></form>}
    {!rs?.length && <p>Belum ada transaksi berulang.</p>}
    <ul>{rs?.map(r => <li key={r.id}>{r.description || cn.get(r.category_id)} — {r.type === "income" ? "+" : "−"}{rupiah(Number(r.amount))} · {wn.get(r.wallet_id)} · tiap {r.interval_n} {FREQ[r.frequency]} · mulai {tanggal(r.start_date)}{r.end_date ? `, sampai ${tanggal(r.end_date)}` : ""} {r.is_active ? "" : "[nonaktif]"}
      {canWrite(role) && <form action={toggle} style={{ display: "inline" }}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="active" value={String(r.is_active)} /> <button>{r.is_active ? "Nonaktifkan" : "Aktifkan"}</button></form>}</li>)}</ul></main>);
}
