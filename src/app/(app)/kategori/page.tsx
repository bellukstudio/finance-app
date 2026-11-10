import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canManage, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

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
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return back("/kategori", "Hanya Owner/Admin.");
  const id = String(fd.get("id"));
  const { error } = await sb.from("categories").delete().eq("id", id);
  let msg: string | null = null;
  if (error?.code === "23503") {
    const r = await sb.from("categories").update({ is_active: false, deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", id);
    msg = r.error ? pgMessage(r.error) : "Kategori sudah dipakai transaksi, jadi diarsipkan (tidak dihapus permanen).";
  } else msg = pgMessage(error);
  revalidatePath("/kategori"); back("/kategori", msg);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { sb, role } = await getCtx();
  const { data: cats } = await sb.from("categories").select("id,name,type,parent_id").is("deleted_at", null).order("name");
  const parents = cats?.filter(c => !c.parent_id) ?? [];
  return (<main><h1>Kategori</h1>{e && <p role="alert">{e}</p>}
    {canManage(role) && <form action={create}><input name="name" placeholder="Nama kategori" required />
      <select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
      <select name="parent_id"><option value="">Tanpa induk</option>{parents.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}</select><button>Tambah</button></form>}
    {(["expense","income"] as const).map(t => (<section key={t}><h2>{t === "expense" ? "Pengeluaran" : "Pemasukan"}</h2>
      <ul>{cats?.filter(c => c.type === t).map(c => <li key={c.id}>{c.parent_id ? "↳ " : ""}{c.name}
        {canManage(role) && <form action={remove} style={{ display: "inline" }}><input type="hidden" name="id" value={c.id} /> <button>Hapus</button></form>}</li>)}</ul></section>))}</main>);
}
