import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
async function rename(fd: FormData) {
  "use server";
  const { sb, familyId, role } = await getCtx();
  if (role !== "owner") return back("/pengaturan", "Hanya Owner.");
  const p = z.string().trim().min(2).max(80).safeParse(fd.get("name")); if (!p.success) return back("/pengaturan", "Nama tidak valid.");
  const { error } = await sb.from("families").update({ name: p.data }).eq("id", familyId);
  revalidatePath("/pengaturan"); back("/pengaturan", error ? pgMessage(error) : "Tersimpan.");
}
async function signOutAll() { "use server"; const { sb } = await getCtx(); await sb.auth.signOut({ scope: "global" }); redirect("/login"); }
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams; const { sb, familyId, role } = await getCtx();
  const { data: f } = await sb.from("families").select("name,currency,timezone").eq("id", familyId).single();
  return (<main><h1>Pengaturan</h1>{e && <p role="status">{e}</p>}<p>Mata uang: {f?.currency} · Zona waktu: {f?.timezone}</p>
    {role === "owner" && <form action={rename}><input name="name" defaultValue={f?.name} /><button>Ubah nama keluarga</button></form>}
    <form action={signOutAll}><button>Keluar dari semua perangkat</button></form></main>);
}
