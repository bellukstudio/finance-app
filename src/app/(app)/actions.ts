"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canWrite } from "@/lib/context";
import { pgMessage } from "@/lib/errors";

const Base = z.object({ date: z.string().date(), amount: z.coerce.number().positive().max(9_999_999_999_999), wallet_id: z.string().uuid(),
  note: z.string().max(200).optional(), budget_id: z.string().uuid().nullable().optional(), idem: z.string().min(8) });
const Tx = z.discriminatedUnion("type", [
  Base.extend({ type: z.literal("income"), category_id: z.string().uuid() }),
  Base.extend({ type: z.literal("expense"), category_id: z.string().uuid() }),
  Base.extend({ type: z.literal("transfer"), to_wallet_id: z.string().uuid() }),
]);
export type TxInput = z.input<typeof Tx>;
export type Result = { ok: true } | { ok: false; error: string };
export type TxResult = { ok: true; id: string | null } | { ok: false; error: string };

/** Catat pemasukan / pengeluaran / transfer. Pengeluaran memotong budget terpilih, transfer menambah total budget terpilih. */
export async function saveTx(input: TxInput): Promise<TxResult> {
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return { ok: false, error: "Viewer tidak dapat mencatat transaksi." };
  const p = Tx.safeParse(input);
  if (!p.success) return { ok: false, error: "Input tidak valid." };
  const v = p.data;
  if (v.budget_id) {
    const { data: b } = await sb.from("budgets").select("id").eq("id", v.budget_id).is("deleted_at", null).maybeSingle();
    if (!b) return { ok: false, error: "Budget tidak ditemukan." };
  }
  let error: { code?: string; message?: string } | null = null, id: string | null = null;
  if (v.type === "transfer") {
    if (v.to_wallet_id === v.wallet_id) return { ok: false, error: "Wallet asal dan tujuan harus berbeda." };
    const r = await sb.rpc("create_transfer", { fid: familyId, src: v.wallet_id, dst: v.to_wallet_id, amt: v.amount, d: v.date, nt: v.note || null, idem: v.idem, bid: v.budget_id ?? null });
    error = r.error; id = typeof r.data === "string" ? r.data : null;
  } else {
    const r = await sb.from("transactions").insert({ family_id: familyId, type: v.type, date: v.date, amount: v.amount, wallet_id: v.wallet_id, category_id: v.category_id,
      description: v.note || null, budget_id: v.type === "expense" ? v.budget_id ?? null : null, created_by: user.id, idempotency_key: v.idem }).select("id").single();
    error = r.error; id = r.data?.id ?? null;
  }
  if (error?.code === "23505") return { ok: false, error: "Transaksi sudah tercatat." };
  if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan." };
  revalidatePath("/", "layout");
  return { ok: true, id };
}
