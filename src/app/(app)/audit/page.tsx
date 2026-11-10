import { getCtx, canManage } from "@/lib/context";
export default async function Page() {
  const { sb, role, familyId } = await getCtx();
  if (!canManage(role)) return <p>Hanya Owner/Admin yang dapat melihat audit log.</p>;
  const { data } = await sb.from("audit_logs").select("id,action,table_name,actor,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(100);
  return (<main><h1>Audit Log</h1>{!data?.length ? <p>Belum ada catatan.</p> : <table><tbody>{data.map(a => <tr key={a.id}><td>{new Date(a.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td><td>{a.action}</td><td>{a.table_name}</td><td>{a.actor?.slice(0, 8)}</td></tr>)}</tbody></table>}</main>);
}
