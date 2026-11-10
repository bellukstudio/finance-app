import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/context";
import { tanggal } from "@/lib/format";
async function readAll() { "use server"; const { sb, user, familyId } = await getCtx(); await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).eq("family_id", familyId).is("read_at", null); revalidatePath("/notifikasi"); }
export default async function Page() {
  const { sb, familyId } = await getCtx();
  const { data } = await sb.from("notifications").select("id,title,body,kind,read_at,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(100);
  return (<main><meta httpEquiv="refresh" content="60" /><h1>Notifikasi</h1><form action={readAll}><button>Tandai semua dibaca</button></form>
    {!data?.length ? <p>Belum ada notifikasi.</p> : <ul>{data.map(n => <li key={n.id} style={{ fontWeight: n.read_at ? "normal" : "bold" }}>{tanggal(n.created_at)} · {n.title} — {n.body}</li>)}</ul>}</main>);
}
