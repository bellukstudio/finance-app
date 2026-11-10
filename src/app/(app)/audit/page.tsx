import { getCtx, canManage } from "@/lib/context";
import { DataTable, type DTRow } from "@/components/data-table";

export default async function Page() {
  const { sb, role, familyId } = await getCtx();
  if (!canManage(role)) return <p>Hanya Owner/Admin yang dapat melihat audit log.</p>;
  const { data } = await sb.from("audit_logs").select("id,action,table_name,actor,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(500);
  const rows: DTRow[] = (data ?? []).map(a => {
    const when = new Date(a.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }), actor = a.actor?.slice(0, 8) ?? "-";
    return { id: String(a.id), search: `${when} ${a.action} ${a.table_name} ${actor}`, sort: { when: a.created_at, action: a.action, table: a.table_name, actor },
      cells: { when, action: <span className="pill">{a.action}</span>, table: a.table_name, actor: <span className="mono">{actor}</span> } };
  });
  return (<main><h1>Audit Log</h1>
    <DataTable label="Audit log" rows={rows} empty="Belum ada catatan." defaultSort={{ key: "when", dir: "desc" }} pageSize={25} placeholder="Cari aksi, tabel, aktor…"
      columns={[{ key: "when", header: "Waktu", sortable: true }, { key: "action", header: "Aksi", sortable: true }, { key: "table", header: "Tabel", sortable: true }, { key: "actor", header: "Aktor", sortable: true }]} />
  </main>);
}
