import { revalidatePath } from "next/cache";
import { getCtx, canWrite, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rupiah } from "@/lib/format";
import { Icon } from "@/components/icons";
import { TxRow } from "@/components/tx-row";
import { TxAttachments } from "@/components/tx-attachments";

const PAGE = 30;
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function del(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/transaksi", "Viewer tidak dapat mengubah data.");
  const tid = fd.get("id"); if (!isUuid(tid)) return back("/transaksi", "Input tidak valid.");
  const { error } = await sb.from("transactions").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", tid).eq("family_id", familyId);
  revalidatePath("/", "layout"); back("/transaksi", pgMessage(error));
}
async function dup(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return back("/transaksi", "Viewer tidak dapat mengubah data.");
  const did = fd.get("id"); if (!isUuid(did)) return back("/transaksi", "Input tidak valid.");
  const { data: t } = await sb.from("transactions").select("type,amount,wallet_id,category_id,description,note,budget_id").eq("id", did).eq("family_id", familyId).single();
  if (!t || t.type === "transfer") return back("/transaksi", "Transfer tidak dapat diduplikasi dari sini.");
  const { error } = await sb.from("transactions").insert({ ...t, date: new Date().toISOString().slice(0, 10), family_id: familyId, created_by: user.id });
  revalidatePath("/", "layout"); back("/transaksi", pgMessage(error));
}

type SP = { e?: string; q?: string; wallet?: string; type?: string; from?: string; to?: string; page?: string };
const DAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], MON = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const SHORT = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sb, role, familyId } = await getCtx();
  const pg = Math.max(1, Number(sp.page) || 1);
  let q = sb.from("transactions").select("id,date,type,amount,description,note,wallet_id,to_wallet_id,category_id,budget_id,created_by", { count: "exact" }).eq("family_id", familyId).is("deleted_at", null)
    .order("date", { ascending: false }).order("created_at", { ascending: false }).range((pg - 1) * PAGE, pg * PAGE - 1);
  if (sp.q) q = q.ilike("description", `%${sp.q.replace(/[%_]/g, "")}%`);
  if (sp.wallet) q = q.eq("wallet_id", sp.wallet);
  if (sp.type) q = q.eq("type", sp.type);
  if (sp.from) q = q.gte("date", sp.from);
  if (sp.to) q = q.lte("date", sp.to);
  const [{ data: txs, count }, { data: wallets }, { data: cats }, { data: bs }] = await Promise.all([q,
    sb.from("wallets").select("id,name").eq("family_id", familyId).is("deleted_at", null), sb.from("categories").select("id,name").eq("family_id", familyId).is("deleted_at", null),
    sb.from("budgets").select("id,name,category_id").eq("family_id", familyId).is("deleted_at", null)]);
  const cn = new Map(cats?.map(c => [c.id, c.name]));
  const maps = { wallets: new Map(wallets?.map(w => [w.id, w.name])), cats: cn, budgets: new Map((bs ?? []).map(b => [b.id, b.name || (b.category_id && cn.get(b.category_id)) || "Budget"])) };
  const { data: atts } = txs?.length ? await sb.from("attachments").select("id,transaction_id,mime_type,size_bytes").in("transaction_id", txs.map(t => t.id)).is("deleted_at", null) : { data: [] as { id: string; transaction_id: string; mime_type: string; size_bytes?: number }[] };
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "e" && k !== "page")) as Record<string, string>, page: String(p) })}`;
  const groups = new Map<string, NonNullable<typeof txs>>();
  (txs ?? []).forEach(t => groups.set(t.date, [...(groups.get(t.date) ?? []), t]));
  return (<main>
    <div className="ph"><div><h1>Transaksi</h1><small className="muted">{count ?? 0} transaksi</small></div>
      <div className="toolbar"><a className="btn ghost" href="/api/export?format=csv">CSV</a><a className="btn ghost" href="/api/export?format=xlsx">Excel</a><a className="btn ghost" href="/api/export?format=pdf">PDF</a>
        {canWrite(role) && <button type="button" data-open-tx><Icon n="plus" /> Transaksi</button>}</div></div>
    {sp.e && <p role="alert">{sp.e}</p>}
    <form method="get" className="filters"><input name="q" placeholder="Cari deskripsi" defaultValue={sp.q} />
      <select name="type" defaultValue={sp.type}><option value="">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select>
      <select name="wallet" defaultValue={sp.wallet}><option value="">Semua dompet</option>{wallets?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <input type="date" name="from" defaultValue={sp.from} aria-label="Dari tanggal" /><input type="date" name="to" defaultValue={sp.to} aria-label="Sampai tanggal" /><button className="ghost">Filter</button></form>
    {!txs?.length ? <p className="muted">Tidak ada transaksi.</p> : [...groups].map(([date, list]) => {
      const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)), d = Number(date.slice(8, 10)), dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const sum = (t: string) => list.filter(x => x.type === t).reduce((a, x) => a + Number(x.amount), 0), e = sum("expense"), i = sum("income"), tr = sum("transfer");
      return <section key={date} className="dg">
        <div className="dh"><div className="who"><span className="dbox"><b>{d}</b><small>{SHORT[m - 1]}</small></span><div><b>{DAY[dow]}, {d} {MON[m - 1]}</b><br /><small className="muted">{list.length} transaksi</small></div></div>
          <div className="tot">{i > 0 && <span className="inc">+{rupiah(i)}</span>}{e > 0 && <span className="exp">−{rupiah(e)}</span>}{tr > 0 && <span className="trf">{rupiah(tr)}</span>}</div></div>
        {list.map(t => <TxRow key={t.id} t={t} maps={maps}>
          <div className="tx-actions">
            {canWrite(role) && t.type !== "transfer" && <form action={dup}><input type="hidden" name="id" value={t.id} /><button className="ghost sm">Duplikasi</button></form>}
            {canManage(role) && <form action={del}><input type="hidden" name="id" value={t.id} /><button className="danger sm" data-confirm="Saldo wallet dan pemakaian budget akan menyesuaikan." data-confirm-title="Hapus transaksi ini?" data-confirm-label="Hapus">Hapus</button></form>}
            <TxAttachments
              transactionId={t.id}
              transactionTitle={t.description || t.note || maps.cats.get(t.category_id ?? "") || (t.type === "transfer" ? "Transfer" : "Transaksi")}
              amount={t.amount}
              date={t.date}
              attachments={atts?.filter(x => x.transaction_id === t.id) ?? []}
              canWrite={canWrite(role)}
              canManage={canManage(role)}
            />
          </div></TxRow>)}
      </section>;
    })}
    <div className="toolbar" style={{ justifyContent: "space-between" }}><small className="muted">Halaman {pg} dari {pages}</small>
      <span className="toolbar">{pg > 1 && <a className="btn ghost" href={link(pg - 1)}>‹ Sebelumnya</a>}{pg < pages && <a className="btn ghost" href={link(pg + 1)}>Berikutnya ›</a>}</span></div>
  </main>);
}
