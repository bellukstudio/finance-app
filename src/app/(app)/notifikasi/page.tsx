import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/context";
import { tanggal } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { DataTable, type DTRow } from "@/components/data-table";
async function readAll() { "use server"; const { sb, user, familyId } = await getCtx(); await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).eq("family_id", familyId).is("read_at", null); revalidatePath("/notifikasi"); }
export default async function Page() {
  const { sb, familyId } = await getCtx();
  const { data } = await sb.from("notifications").select("id,title,body,kind,read_at,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(100);
  const rows: DTRow[] = (data ?? []).map(n => ({ id: n.id, search: `${n.title} ${n.body}`, sort: { date: n.created_at, title: n.title, st: n.read_at ? 1 : 0 },
    cells: { date: tanggal(n.created_at), title: <span className={n.read_at ? undefined : "strong"}>{n.title}</span>, body: <span className={n.read_at ? "muted" : undefined}>{n.body}</span>, st: <span className={`pill${n.read_at ? "" : " expense"}`}>{n.read_at ? "Dibaca" : "Baru"}</span> } }));
  return (<main><AutoRefresh seconds={60} /><h1>Notifikasi</h1><form action={readAll}><button>Tandai semua dibaca</button></form>
    <DataTable label="Notifikasi" rows={rows} empty="Belum ada notifikasi." defaultSort={{ key: "date", dir: "desc" }} placeholder="Cari notifikasi…"
      columns={[{ key: "date", header: "Tanggal", sortable: true }, { key: "title", header: "Judul", sortable: true }, { key: "body", header: "Isi", wrap: true }, { key: "st", header: "Status", sortable: true }]} /></main>);
}
