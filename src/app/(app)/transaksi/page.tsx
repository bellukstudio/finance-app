import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah, tanggal } from "@/lib/format";
import { TxForm } from "@/components/tx-form";

const PAGE = 20;
const Tx = z.object({ type: z.enum(["income","expense"]), date: z.string().date(), amount: z.coerce.number().positive(),
  wallet_id: z.string().uuid(), category_id: z.string().uuid(), description: z.string().max(200).optional(), note: z.string().max(500).optional(), idem: z.string().min(8) });

async function add(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/transaksi", "Viewer tidak dapat mencatat transaksi.");
  const p = Tx.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/transaksi", "Input tidak valid.");
  const { idem, ...v } = p.data;
  const { error } = await sb.from("transactions").insert({ ...v, family_id: familyId, created_by: user.id, idempotency_key: idem });
  revalidatePath("/transaksi"); back("/transaksi", error?.code === "23505" ? "Transaksi sudah tercatat." : pgMessage(error));
}
async function del(fd: FormData) {
  "use server";
  const { sb, user } = await getCtx();
  const { error } = await sb.from("transactions").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", String(fd.get("id")));
  revalidatePath("/transaksi"); back("/transaksi", pgMessage(error));
}
async function dup(fd: FormData) {
  "use server";
  const { sb, user, familyId } = await getCtx();
  const { data: t } = await sb.from("transactions").select("type,amount,wallet_id,category_id,description,note").eq("id", String(fd.get("id"))).single();
  if (!t || t.type === "transfer") return back("/transaksi", "Transfer tidak dapat diduplikasi dari sini.");
  const { error } = await sb.from("transactions").insert({ ...t, date: new Date().toISOString().slice(0, 10), family_id: familyId, created_by: user.id });
  revalidatePath("/transaksi"); back("/transaksi", pgMessage(error));
}

type SP = { e?: string; q?: string; wallet?: string; type?: string; from?: string; to?: string; page?: string };
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sb, role } = await getCtx();
  const pg = Math.max(1, Number(sp.page) || 1);
  let q = sb.from("transactions").select("id,date,type,amount,description,wallet_id,created_by", { count: "exact" }).is("deleted_at", null)
    .order("date", { ascending: false }).order("created_at", { ascending: false }).range((pg - 1) * PAGE, pg * PAGE - 1);
  if (sp.q) q = q.ilike("description", `%${sp.q.replace(/[%_]/g, "")}%`);
  if (sp.wallet) q = q.eq("wallet_id", sp.wallet);
  if (sp.type) q = q.eq("type", sp.type);
  if (sp.from) q = q.gte("date", sp.from);
  if (sp.to) q = q.lte("date", sp.to);
  const [{ data: txs, count }, { data: wallets }, { data: cats }] = await Promise.all([q,
    sb.from("wallets").select("id,name").is("deleted_at", null), sb.from("categories").select("id,name,type").is("deleted_at", null).eq("is_active", true)]);
  const wn = new Map(wallets?.map(w => [w.id, w.name]));
  const { data: atts } = txs?.length ? await sb.from("attachments").select("id,transaction_id,mime_type").in("transaction_id", txs.map(t => t.id)).is("deleted_at", null) : { data: [] as { id: string; transaction_id: string; mime_type: string }[] };
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "e" && k !== "page")) as Record<string, string>, page: String(p) })}`;
  const L: Record<string, string> = { income: "Pemasukan", expense: "Pengeluaran", transfer: "Transfer" };
  return (<main>
    <div className="head"><div><h1>Transaksi</h1><small>{count ?? 0} transaksi</small></div>
      <div className="toolbar"><a className="btn ghost" href="/api/export?format=csv">CSV</a><a className="btn ghost" href="/api/export?format=xlsx">Excel</a><a className="btn ghost" href="/api/export?format=pdf">PDF</a></div></div>
    {sp.e && <p role="alert">{sp.e}</p>}
    {canWrite(role) && <TxForm action={add} idem={crypto.randomUUID()} wallets={wallets ?? []} cats={cats ?? []} />}
    <form method="get" className="filters"><input name="q" placeholder="Cari deskripsi" defaultValue={sp.q} />
      <select name="type" defaultValue={sp.type}><option value="">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select>
      <select name="wallet" defaultValue={sp.wallet}><option value="">Semua dompet</option>{wallets?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <input type="date" name="from" defaultValue={sp.from} /><input type="date" name="to" defaultValue={sp.to} /><button className="ghost">Filter</button></form>
    {!txs?.length ? <p className="muted">Tidak ada transaksi.</p> : <div className="tx">{txs.map(t => <article key={t.id} className="tx-row">
      <div className="tx-main"><div><b style={{ fontVariantNumeric: "normal" }}>{t.description || L[t.type]}</b><br /><small>{tanggal(t.date)} · {wn.get(t.wallet_id)}</small></div>
        <div style={{ textAlign: "right" }}><b className={t.type === "income" ? "inc" : t.type === "expense" ? "exp" : ""}>{t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{rupiah(Number(t.amount))}</b><br /><span className={`pill ${t.type}`}>{L[t.type]}</span></div></div>
      <div className="tx-actions">
        {canWrite(role) && <form action={dup}><input type="hidden" name="id" value={t.id} /><button className="ghost">Duplikasi</button></form>}
        {canManage(role) && <form action={del}><input type="hidden" name="id" value={t.id} /><button className="danger">Hapus</button></form>}
        <details className="more"><summary>Nota{atts?.some(x => x.transaction_id === t.id) ? " (ada)" : ""}</summary>
          <div className="tx-actions">{atts?.filter(x => x.transaction_id === t.id).map(x => <span key={x.id} className="tx-actions"><a href={`/api/attachments/${x.id}`} target="_blank">Lihat</a><a href={`/api/attachments/${x.id}?dl=1`}>Unduh</a>{canManage(role) && <form action={`/api/attachments/${x.id}`} method="post"><button className="danger">Hapus nota</button></form>}</span>)}
            {canWrite(role) && <form action="/api/attachments" method="post" encType="multipart/form-data" className="tx-actions"><input type="hidden" name="transaction_id" value={t.id} /><input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /><button className="ghost">Unggah</button></form>}</div></details>
      </div></article>)}</div>}
    <div className="toolbar" style={{ justifyContent: "space-between" }}><small>Halaman {pg} dari {pages}</small>
      <span className="toolbar">{pg > 1 && <a className="btn ghost" href={link(pg - 1)}>‹ Sebelumnya</a>}{pg < pages && <a className="btn ghost" href={link(pg + 1)}>Berikutnya ›</a>}</span></div>
  </main>);
}
