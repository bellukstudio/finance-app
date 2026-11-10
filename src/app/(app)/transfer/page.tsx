import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

const T = z.object({ src: z.string().uuid(), dst: z.string().uuid(), amt: z.coerce.number().positive(), d: z.string().date(),
  fee: z.coerce.number().min(0).default(0), fee_cat: z.string().uuid().optional().or(z.literal("")), nt: z.string().max(200).optional(), bid: z.string().uuid().optional().or(z.literal("")), idem: z.string().min(8) })
  .refine(v => v.src !== v.dst, "Dompet asal dan tujuan harus berbeda")
  .refine(v => v.fee === 0 || !!v.fee_cat, "Pilih kategori untuk biaya transfer");

async function submit(fd: FormData) {
  "use server";
  const { sb, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/transfer", "Viewer tidak dapat mencatat transaksi.");
  const p = T.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/transfer", p.error.issues[0]?.message ?? "Input tidak valid.");
  const v = p.data;
  const { error } = await sb.rpc("create_transfer", { fid: familyId, src: v.src, dst: v.dst, amt: v.amt, d: v.d, fee: v.fee, fee_cat: v.fee_cat || null, nt: v.nt ?? null, idem: v.idem, bid: v.bid || null });
  revalidatePath("/", "layout");
  back("/transfer", error ? (error.code === "23505" ? "Transfer ini sudah tercatat." : pgMessage(error)) : "Transfer berhasil dicatat.");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role } = await getCtx();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: ws }, { data: cats }, { data: bs }] = await Promise.all([sb.from("wallets").select("id,name").eq("is_active", true).is("deleted_at", null),
    sb.from("categories").select("id,name").eq("type", "expense").eq("is_active", true).is("deleted_at", null),
    sb.from("budgets").select("id,name,start_date,end_date").is("deleted_at", null).gte("end_date", today)]);
  return (<main><div className="ph"><div><h1>Transfer Antar-Dompet</h1><small className="muted">Transfer tidak dihitung sebagai pemasukan/pengeluaran. Jika dialokasikan, transfer menambah total budget.</small></div></div>
    {e && <p role="status" className="banner info">{e}</p>}
    {canWrite(role) ? <form action={submit} className="card" style={{ display: "grid", gap: 14, maxWidth: 560 }}><input type="hidden" name="idem" value={crypto.randomUUID()} />
      <div className="two"><label className="fld"><span>Wallet asal</span><select name="src">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label className="fld"><span>Wallet tujuan</span><select name="dst" defaultValue={ws?.[1]?.id}>{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
      <div className="two"><label className="fld"><span>Nominal (Rp)</span><input name="amt" type="number" step="0.01" placeholder="0" required /></label>
        <label className="fld"><span>Tanggal</span><input name="d" type="date" defaultValue={today} required /></label></div>
      <div className="alloc"><span className="lbl">Tambah ke budget (opsional)</span>
        <select name="bid" aria-label="Budget" defaultValue=""><option value="">Tidak dialokasikan</option>{bs?.map(b => <option key={b.id} value={b.id}>{b.name || "Budget"} ({b.start_date.slice(0, 7)})</option>)}</select>
        <small className="muted">Transfer menambah total budget yang dipilih.</small></div>
      <div className="two"><label className="fld"><span>Biaya transfer (opsional)</span><input name="fee" type="number" step="0.01" placeholder="0" defaultValue={0} /></label>
        <label className="fld"><span>Kategori biaya</span><select name="fee_cat"><option value="">Pilih kategori</option>{cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
      <label className="fld"><span>Catatan</span><input name="nt" placeholder="Opsional…" /></label>
      <button className="save">Transfer</button></form> : <p>Anda hanya dapat melihat.</p>}</main>);
}
