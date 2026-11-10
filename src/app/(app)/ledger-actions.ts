"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx, setLedgerCookie, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

/** Pindah catatan aktif: "personal" (milik sendiri) atau id grup keluarga yang diikuti user. */
export async function switchLedger(fd: FormData) {
  const to = String(fd.get("to") ?? "");
  const { sb, ledgers } = await getCtx();
  if (to === "personal") {
    const { error } = await sb.rpc("ensure_personal_ledger");  // idempoten: membuat saat pertama kali dibuka
    if (error) return back("/dashboard", pgMessage(error));
  } else if (!ledgers.some((l) => l.kind === "family" && l.key === to)) {
    return back("/dashboard", "Catatan tidak ditemukan atau Anda bukan anggotanya.");
  }
  await setLedgerCookie(to);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
