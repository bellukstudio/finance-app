import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
async function accept(fd: FormData) {
  "use server";
  const sb = await supabaseServer();
  const { error } = await sb.rpc("accept_invitation", { tok: String(fd.get("token")) });
  redirect(error ? "/undangan/gagal" : "/dashboard");
}
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === "gagal") return <p>Undangan tidak valid atau sudah kedaluwarsa.</p>;
  return <form action={accept}><h1>Undangan Keluarga</h1><input type="hidden" name="token" value={token} /><button>Terima undangan</button></form>;
}
