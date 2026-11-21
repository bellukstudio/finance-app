import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { todayJakarta } from "@/lib/period";
import { DEBT_LABEL, debtStatus, remaining } from "@/lib/finance";
import { MoneyInput } from "@/components/money-input";

const D = z.object({ direction: z.enum(["payable","receivable"]), counterparty: z.string().trim().min(1).max(80), principal: z.coerce.number().positive(), due_date: z.string().date().optional().or(z.literal("")), notes: z.string().max(300).optional() });
async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/utang", "Viewer tidak dapat mengubah data.");
  const p = D.safeParse(Object.fromEntries(fd)); if (!p.success) return back("/utang", "Input tidak valid.");
  const { error } = await sb.from("debts").insert({ ...p.data, due_date: p.data.due_date || null, family_id: familyId, created_by: user.id });
  revalidatePath("/utang"); back("/utang", pgMessage(error));
}
async function update(fd: FormData) {
  "use server";
  const { sb, role, familyId } = await getCtx();
  if (!canWrite(role)) return back("/utang", "Viewer tidak dapat mengubah data.");
  const p = z.object({ id: z.string().uuid(), direction: z.enum(["payable","receivable"]), counterparty: z.string().trim().min(1).max(80), principal: z.coerce.number().positive(), due_date: z.string().date().optional().or(z.literal("")), notes: z.string().trim().max(300).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/utang", "Periksa kembali data utang/piutang.");
  const { data: debt } = await sb.from("debts").select("id,direction").eq("id", p.data.id).eq("family_id", familyId).is("deleted_at", null).maybeSingle();
  if (!debt) return back("/utang", "Data tidak ditemukan.");
  const { data: payments } = await sb.from("debt_payments").select("amount").eq("debt_id", p.data.id).eq("family_id", familyId).is("deleted_at", null);
  const paidTotal = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (p.data.principal < paidTotal) return back("/utang", "Pokok tidak boleh lebih kecil dari total pembayaran yang sudah tercatat.");
  if (debt.direction !== p.data.direction && paidTotal > 0) return back("/utang", "Jenis transaksi tidak dapat diubah karena sudah memiliki riwayat pembayaran.");
  const { id, ...values } = p.data;
  const { error } = await sb.from("debts").update({ ...values, due_date: values.due_date || null, notes: values.notes || null }).eq("id", id).eq("family_id", familyId);
  revalidatePath("/utang");
  back("/utang", pgMessage(error));
}
async function pay(fd: FormData) {
  "use server";
  const { sb, role } = await getCtx();
  if (!canWrite(role)) return back("/utang", "Viewer tidak dapat mengubah data.");
  const p = z.object({ did: z.string().uuid(), amt: z.coerce.number().positive(), d: z.string().date(), wid: z.string().uuid(), cid: z.string().uuid() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/utang", "Input pembayaran tidak valid.");
  const { error } = await sb.rpc("pay_debt", p.data);
  revalidatePath("/utang"); back("/utang", pgMessage(error));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role, familyId } = await getCtx(); const today = todayJakarta();
  const [{ data: ds }, { data: ps }, { data: ws }, { data: cats }] = await Promise.all([sb.from("debts").select("*").eq("family_id", familyId).is("deleted_at", null).order("due_date", { nullsFirst: false }),
    sb.from("debt_payments").select("debt_id,amount,paid_on").eq("family_id", familyId).is("deleted_at", null).order("paid_on", { ascending: false }),
    sb.from("wallets").select("id,name").eq("family_id", familyId).eq("is_active", true).is("deleted_at", null), sb.from("categories").select("id,name,type").eq("family_id", familyId).eq("is_active", true).is("deleted_at", null)]);
  return (<main>
    <div className="head"><div><h1>Utang &amp; Piutang</h1><small>Catat pokok, jatuh tempo, dan pembayaran</small></div></div>
    {e && <p role="alert">{e}</p>}
    <p>Pembayaran membuat transaksi dompet otomatis dalam satu proses (tidak dihitung dua kali) dan dikecualikan dari laporan kategori.</p>
    {canWrite(role) && <section className="card" style={{ marginBottom: 20 }}>
      <div className="between"><div><h2 style={{ margin: 0 }}>Catat utang / piutang</h2><small className="muted">Lengkapi pihak terkait, nominal, jatuh tempo, dan keterangan.</small></div></div>
      <form action={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>Jenis transaksi
          <select name="direction" defaultValue="receivable"><option value="receivable">Piutang — orang berutang kepada saya</option><option value="payable">Utang — saya berutang kepada orang lain</option></select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>Nama pihak terkait
          <input name="counterparty" placeholder="Nama orang / perusahaan" maxLength={80} required />
        </label>
        <label style={{ display: "grid", gap: 6 }}>Nominal pokok (Rp)
          <MoneyInput name="principal" placeholder="0" required />
        </label>
        <label style={{ display: "grid", gap: 6 }}>Tanggal jatuh tempo
          <input name="due_date" type="date" />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Catatan / keterangan
          <textarea name="notes" rows={3} maxLength={300} placeholder="Tujuan pinjaman, kesepakatan, atau nomor referensi" />
        </label>
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><button type="submit">Simpan data</button></div>
      </form>
    </section>}
    {!ds?.length ? <p className="muted">Belum ada data.</p> : <div className="cards">{ds.map(d => { const mine = ps?.filter(p => p.debt_id === d.id) ?? []; const pr = Number(d.principal); const rem = remaining(pr, mine.map(p => Number(p.amount))); const st = debtStatus(rem, d.due_date, today);
      const cc = cats?.filter(c => c.type === (d.direction === "payable" ? "expense" : "income")) ?? []; const paid = pr > 0 ? Math.min(100, ((pr - rem) / pr) * 100) : 0;
      return <article key={d.id} className="card"><div className="between"><b>{d.counterparty}</b><span className="pill">{DEBT_LABEL[st]}</span></div>
        <small>{d.direction === "payable" ? "Utang saya" : "Piutang saya"} · jatuh tempo {d.due_date ? tanggal(d.due_date) : "Belum ditentukan"}</small>
        {d.notes && <p className="muted" style={{ margin: "8px 0" }}>{d.notes}</p>}
        <div className="big2">{rupiah(rem)}</div>
        <div className="bar"><i style={{ width: `${paid}%` }} /></div><small>Sisa dari pokok {rupiah(pr)}</small>
        {rem > 0 && canWrite(role) && <details className="more"><summary>{d.direction === "payable" ? "Catat pembayaran" : "Catat penerimaan"}</summary><form action={pay} className="row"><input type="hidden" name="did" value={d.id} />
          <MoneyInput name="amt" maxLength={15} placeholder="Nominal (Rp)" required /><input name="d" type="date" defaultValue={today} required />
          <select name="wid">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><select name="cid">{cc.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="sm">{d.direction === "payable" ? "Bayar" : "Terima"}</button></form></details>}
        {canWrite(role) && <details className="more"><summary>Edit data</summary>
          <form action={update} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 10, paddingTop: 12 }}>
            <input type="hidden" name="id" value={d.id} />
            <label style={{ display: "grid", gap: 5 }}>Jenis
              <select name="direction" defaultValue={d.direction} disabled={mine.length > 0}>
                <option value="payable">Utang — saya berutang</option><option value="receivable">Piutang — orang berutang</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 5 }}>Pihak terkait
              <input name="counterparty" defaultValue={d.counterparty} maxLength={80} required />
            </label>
            <label style={{ display: "grid", gap: 5 }}>Pokok (Rp)
              <MoneyInput name="principal" min={mine.reduce((sum, p) => sum + Number(p.amount), 0)} defaultValue={d.principal} required />
            </label>
            <label style={{ display: "grid", gap: 5 }}>Jatuh tempo
              <input name="due_date" type="date" defaultValue={d.due_date ?? ""} />
            </label>
            <label style={{ display: "grid", gap: 5, gridColumn: "1 / -1" }}>Catatan
              <textarea name="notes" rows={2} maxLength={300} defaultValue={d.notes ?? ""} />
            </label>
            {mine.length > 0 && <small className="muted" style={{ gridColumn: "1 / -1" }}>Jenis transaksi dikunci karena sudah ada riwayat pembayaran.</small>}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><button className="sm" type="submit">Simpan perubahan</button></div>
          </form>
        </details>}
        <details className="more"><summary>Riwayat ({mine.length})</summary><ul className="list">{mine.map((p, i) => <li key={i}><span>{tanggal(p.paid_on)}</span><b>{rupiah(Number(p.amount))}</b></li>)}</ul></details></article>; })}</div>}
  </main>);
}
