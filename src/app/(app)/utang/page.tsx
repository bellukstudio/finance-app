import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { todayJakarta } from "@/lib/period";
import { DEBT_LABEL, debtStatus, remaining } from "@/lib/finance";

const D = z.object({ direction: z.enum(["payable","receivable"]), counterparty: z.string().trim().min(1).max(80), principal: z.coerce.number().positive(), due_date: z.string().date().optional().or(z.literal("")), notes: z.string().max(300).optional() });
async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/utang", "Viewer tidak dapat mengubah data.");
  const p = D.safeParse(Object.fromEntries(fd)); if (!p.success) return back("/utang", "Input tidak valid.");
  const { error } = await sb.from("debts").insert({ ...p.data, due_date: p.data.due_date || null, family_id: familyId, created_by: user.id });
  revalidatePath("/utang"); back("/utang", pgMessage(error));
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
  const { sb, role } = await getCtx(); const today = todayJakarta();
  const [{ data: ds }, { data: ps }, { data: ws }, { data: cats }] = await Promise.all([sb.from("debts").select("*").is("deleted_at", null).order("due_date", { nullsFirst: false }),
    sb.from("debt_payments").select("debt_id,amount,paid_on").is("deleted_at", null).order("paid_on", { ascending: false }),
    sb.from("wallets").select("id,name").eq("is_active", true).is("deleted_at", null), sb.from("categories").select("id,name,type").eq("is_active", true).is("deleted_at", null)]);
  return (<main><h1>Utang &amp; Piutang</h1>{e && <p role="alert">{e}</p>}
    <p><small>Pembayaran membuat transaksi dompet otomatis dalam satu proses (tidak dihitung dua kali). Pembayaran utang dikecualikan dari laporan kategori; kategori hanya dipakai untuk pencatatan transaksi.</small></p>
    {canWrite(role) && <form action={create}><select name="direction"><option value="payable">Utang (saya berutang)</option><option value="receivable">Piutang (orang berutang ke saya)</option></select>
      <input name="counterparty" placeholder="Pihak terkait" required /><input name="principal" type="number" step="0.01" placeholder="Pokok" required /><input name="due_date" type="date" /><input name="notes" placeholder="Catatan" /><button>Tambah</button></form>}
    {!ds?.length && <p>Belum ada data.</p>}
    <ul>{ds?.map(d => { const mine = ps?.filter(p => p.debt_id === d.id) ?? []; const rem = remaining(Number(d.principal), mine.map(p => Number(p.amount))); const st = debtStatus(rem, d.due_date, today);
      const cc = cats?.filter(c => c.type === (d.direction === "payable" ? "expense" : "income")) ?? [];
      return <li key={d.id}><b>{d.direction === "payable" ? "Utang ke" : "Piutang dari"} {d.counterparty}</b> — pokok {rupiah(Number(d.principal))}, sisa {rupiah(rem)}, jatuh tempo {d.due_date ? tanggal(d.due_date) : "-"} · <b>{DEBT_LABEL[st]}</b>
        {rem > 0 && canWrite(role) && <form action={pay}><input type="hidden" name="did" value={d.id} /><input name="amt" type="number" step="0.01" max={rem} placeholder="Nominal" required /><input name="d" type="date" defaultValue={today} required />
          <select name="wid">{ws?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><select name="cid">{cc.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button>{d.direction === "payable" ? "Bayar" : "Terima"}</button></form>}
        <details><summary>Riwayat pembayaran ({mine.length})</summary><ul>{mine.map((p, i) => <li key={i}>{tanggal(p.paid_on)}: {rupiah(Number(p.amount))}</li>)}</ul></details></li>; })}</ul></main>);
}
