import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

const T = z.object({ src: z.string().uuid(), dst: z.string().uuid(), amt: z.coerce.number().positive(), d: z.string().date(),
  fee: z.coerce.number().min(0).default(0), fee_cat: z.string().uuid().optional().or(z.literal("")), nt: z.string().max(200).optional(), idem: z.string().min(8) })
  .refine(v => v.src !== v.dst, "Dompet asal dan tujuan harus berbeda")
  .refine(v => v.fee === 0 || !!v.fee_cat, "Pilih kategori untuk biaya transfer");

async function submit(fd: FormData) {
  "use server";
  const { sb, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/transfer", "Viewer tidak dapat mencatat transaksi.");
  const p = T.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/transfer", p.error.issues[0]?.message ?? "Input tidak valid.");
  const v = p.data;
  const { error } = await sb.rpc("create_transfer", { fid: familyId, src: v.src, dst: v.dst, amt: v.amt, d: v.d, fee: v.fee, fee_cat: v.fee_cat || null, nt: v.nt ?? null, idem: v.idem });
  revalidatePath("/transfer");
  back("/transfer", error ? (error.code === "23505" ? "Transfer ini sudah tercatat." : pgMessage(error)) : "Transfer berhasil dicatat.");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role } = await getCtx();
  const [{ data: ws }, { data: cats }] = await Promise.all([sb.from("wallets").select("id,name").eq("is_active", true).is("deleted_at", null),
    sb.from("categories").select("id,name").eq("type", "expense").eq("is_active", true).is("deleted_at", null)]);
  return (<main><h1>Transfer Antar-Dompet</h1>{e && <p role="status">{e}</p>}
    <p>Transfer tidak dihitung sebagai pemasukan/pengeluaran maupun budget. Biaya transfer dicatat sebagai pengeluaran terpisah.</p>
    {canWrite(role) ? <form action={submit}><input type="hidden" name="idem" value={crypto.randomUUID()} />
      <select name="src">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select> →
      <select name="dst">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <input name="amt" type="number" step="0.01" placeholder="Nominal" required /><input name="d" type="date" required />
      <input name="fee" type="number" step="0.01" placeholder="Biaya (opsional)" defaultValue={0} />
      <select name="fee_cat"><option value="">Kategori biaya</option>{cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input name="nt" placeholder="Catatan" /><button>Transfer</button></form> : <p>Anda hanya dapat melihat.</p>}</main>);
}
