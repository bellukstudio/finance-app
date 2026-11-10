"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx, LEDGER_COOKIE, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

/** Pindah antara catatan Keluarga dan catatan Pribadi. Catatan pribadi hanya untuk Owner (dijaga juga oleh database). */
export async function switchLedger(fd: FormData) {
  const to = fd.get("to") === "personal" ? "personal" : "family";
  const { sb, canPersonal } = await getCtx();
  const store = await cookies();
  if (to === "personal") {
    if (!canPersonal) return back("/dashboard", "Catatan pribadi hanya tersedia untuk Owner.");
    const { error } = await sb.rpc("ensure_personal_ledger");  // idempoten: membuat saat pertama kali dibuka
    if (error) return back("/dashboard", pgMessage(error));
    store.set(LEDGER_COOKIE, "personal", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(LEDGER_COOKIE);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
