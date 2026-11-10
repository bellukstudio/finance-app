import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
async function signOut() { "use server"; const sb = await supabaseServer(); await sb.auth.signOut(); redirect("/login"); }
const nav = [["/dashboard","Dashboard"],["/transaksi","Transaksi"],["/transfer","Transfer"],["/dompet","Dompet"],["/kategori","Kategori"],["/budget","Budget"],["/laporan","Laporan"],["/aset","Aset"],["/utang","Utang & Piutang"],["/berulang","Berulang"],["/anggota","Anggota"],["/audit","Audit"],["/pengaturan","Pengaturan"]];
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return (<div><nav style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid #ccc" }}>
    {nav.map(([h, l]) => <a key={h} href={h}>{l}</a>)}<a href="/notifikasi">Notifikasi{count ? ` (${count})` : ""}</a>
    <form action={signOut} style={{ marginLeft: "auto" }}><button>Keluar</button></form></nav>{children}</div>);
}
