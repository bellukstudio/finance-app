import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { DataTable, type DTRow } from "@/components/data-table";

const C = z.object({ name: z.string().trim().min(1).max(60), type: z.enum(["income","expense"]), parent_id: z.string().uuid().optional().or(z.literal("")), color: z.string().max(20).optional() });

async function create(fd: FormData) {
  "use server";
  const { sb, user, familyId, role } = await getCtx();
  if (!canManage(role)) return back("/kategori", "Hanya Owner/Admin.");
  const p = C.safeParse(Object.fromEntries(fd));
  if (!p.success) return back("/kategori", "Input tidak valid.");
  const { parent_id, ...rest } = p.data;
  const { error } = await sb.from("categories").insert({ ...rest, parent_id: parent_id || null, family_id: familyId, created_by: user.id });
  revalidatePath("/kategori"); back("/kategori", pgMessage(error));
}
// Hapus permanen hanya jika belum dipakai; jika dipakai, diarsipkan (nonaktif).
async function remove(fd: FormData) {
  "use server";
  const { sb, user, role, familyId } = await getCtx();
  if (!canManage(role)) return back("/kategori", "Hanya Owner/Admin.");
  const id = String(fd.get("id"));
  const { error } = await sb.from("categories").delete().eq("id", id).eq("family_id", familyId);
  let msg: string | null = null;
  if (error?.code === "23503") {
    const r = await sb.from("categories").update({ is_active: false, deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", id).eq("family_id", familyId);
    msg = r.error ? pgMessage(r.error) : "Kategori sudah dipakai transaksi, jadi diarsipkan (tidak dihapus permanen).";
  } else msg = pgMessage(error);
  revalidatePath("/kategori"); back("/kategori", msg);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role, familyId } = await getCtx();
  const { data: cats } = await sb.from("categories").select("id,name,type,parent_id").eq("family_id", familyId).is("deleted_at", null).order("name");
  const parents = cats?.filter(c => !c.parent_id) ?? [];
  const pname = new Map((cats ?? []).map(c => [c.id, c.name]));
  const L = { expense: "Pengeluaran", income: "Pemasukan" } as const;
  return (<main>
    <div className="head"><div><h1>Kategori</h1><small>Kelompokkan transaksi agar laporan lebih jelas</small></div></div>
    {e && <p role="alert">{e}</p>}
    {canManage(role) && <form action={create}><input name="name" placeholder="Nama kategori" required />
      <select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
      <select name="parent_id"><option value="">Tanpa induk</option>{parents.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}</select><button>Tambah</button></form>}
    <div className="grid g2e">{(["expense", "income"] as const).map(t => { const items = cats?.filter(c => c.type === t) ?? [];
      return <section key={t} className="card"><div className="between"><h2 style={{ margin: 0 }}>{L[t]}</h2><span className={`pill ${t}`}>{items.length}</span></div>
        <DataTable label={`Kategori ${L[t]}`} empty="Belum ada kategori." defaultSort={{ key: "name", dir: "asc" }} pageSize={10}
          columns={[{ key: "name", header: "Nama", sortable: true }, { key: "parent", header: "Induk", sortable: true }, ...(canManage(role) ? [{ key: "act", header: "Aksi" }] : [])]}
          rows={items.map((c): DTRow => { const par = c.parent_id ? pname.get(c.parent_id) ?? "-" : "-";
            return { id: c.id, search: `${c.name} ${par}`, sort: { name: c.name, parent: par }, cells: { name: <span className={c.parent_id ? "sub" : "strong"}>{c.parent_id ? "↳ " : ""}{c.name}</span>, parent: par === "-" ? <span className="muted">-</span> : par,
              act: <form action={remove}><input type="hidden" name="id" value={c.id} /><button className="danger sm" data-confirm="Kategori yang masih dipakai transaksi mungkin tidak bisa dihapus." data-confirm-title="Hapus kategori ini?" data-confirm-label="Hapus">Hapus</button></form> } }; })} /></section>; })}</div>
  </main>);
}
