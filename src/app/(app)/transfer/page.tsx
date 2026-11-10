import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { DataTable, type DTRow } from "@/components/data-table";

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
  const { sb, role, familyId } = await getCtx();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: allWs }, { data: cats }, { data: allBs }, { data: trs }] = await Promise.all([
    sb.from("wallets").select("id,name,is_active").eq("family_id", familyId).is("deleted_at", null).order("name"),
    sb.from("categories").select("id,name").eq("family_id", familyId).eq("type", "expense").eq("is_active", true).is("deleted_at", null),
    sb.from("budgets").select("id,name,category_id,start_date,end_date").eq("family_id", familyId).is("deleted_at", null),
    sb.from("transactions").select("id,date,amount,wallet_id,to_wallet_id,description,note,budget_id").eq("family_id", familyId).eq("type", "transfer").is("deleted_at", null)
      .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(300)]);
  const ws = (allWs ?? []).filter(w => w.is_active);
  const bs = (allBs ?? []).filter(b => b.end_date >= today);
  const wn = new Map((allWs ?? []).map(w => [w.id, w.name])), cn = new Map((cats ?? []).map(c => [c.id, c.name]));
  const bn = new Map((allBs ?? []).map(b => [b.id, b.name || (b.category_id && cn.get(b.category_id)) || "Budget"]));
  const rows: DTRow[] = (trs ?? []).map(t => {
    const from = wn.get(t.wallet_id) ?? "?", to = wn.get(t.to_wallet_id ?? "") ?? "?", bud = t.budget_id ? bn.get(t.budget_id) ?? "Budget" : "", nt = t.description || t.note || "";
    return { id: t.id, search: `${from} ${to} ${bud} ${nt}`,
      sort: { date: t.date, from, to, amount: Number(t.amount), budget: bud },
      cells: { date: tanggal(t.date), from, to, amount: <span className="trf">{rupiah(Number(t.amount))}</span>, budget: bud ? <span className="tag bud">+ {bud}</span> : <span className="muted">-</span>, note: nt || <span className="muted">-</span> } };
  });
  return (<main><div className="ph"><div><h1>Transfer Antar-Dompet</h1><small className="muted">Transfer tidak dihitung sebagai pemasukan/pengeluaran. Jika dialokasikan, transfer menambah total budget.</small></div></div>
    {e && <p role="status" className="banner info">{e}</p>}
    {canWrite(role) ? <form action={submit} className="card stack xfer"><input type="hidden" name="idem" value={crypto.randomUUID()} />
      <div className="two"><label className="fld"><span>Wallet asal</span><select name="src">{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label className="fld"><span>Wallet tujuan</span><select name="dst" defaultValue={ws[1]?.id}>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
      <div className="two"><label className="fld"><span>Nominal (Rp)</span><input name="amt" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0" required /></label>
        <label className="fld"><span>Tanggal</span><input name="d" type="date" defaultValue={today} required /></label></div>
      <div className="alloc"><label className="lbl" htmlFor="xf-bid">Tambah ke budget (opsional)</label>
        <select id="xf-bid" name="bid" defaultValue=""><option value="">Tidak dialokasikan</option>{bs.map(b => <option key={b.id} value={b.id}>{b.name || "Budget"} ({b.start_date.slice(0, 7)})</option>)}</select>
        <small className="muted">Transfer menambah total budget yang dipilih.</small></div>
      <div className="two"><label className="fld"><span>Biaya transfer (opsional)</span><input name="fee" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0" defaultValue={0} /></label>
        <label className="fld"><span>Kategori biaya</span><select name="fee_cat"><option value="">Pilih kategori</option>{cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
      <label className="fld"><span>Catatan</span><input name="nt" placeholder="Opsional…" maxLength={200} /></label>
      <SubmitButton className="save" pending="Memproses…">Transfer</SubmitButton></form> : <p>Anda hanya dapat melihat.</p>}
    <h2 className="sec">Riwayat transfer</h2>
    <DataTable label="Riwayat transfer" rows={rows} empty="Belum ada transfer." defaultSort={{ key: "date", dir: "desc" }} placeholder="Cari dompet, budget, catatan…"
      columns={[{ key: "date", header: "Tanggal", sortable: true }, { key: "from", header: "Dari", sortable: true }, { key: "to", header: "Ke", sortable: true },
        { key: "amount", header: "Nominal", align: "right", sortable: true }, { key: "budget", header: "Budget", sortable: true }, { key: "note", header: "Catatan", wrap: true }]} />
  </main>);
}
