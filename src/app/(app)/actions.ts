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
    const { data: b } = await sb.from("budgets").select("id").eq("id", v.budget_id).eq("family_id", familyId).is("deleted_at", null).maybeSingle();
    if (!b) return { ok: false, error: "Budget tidak ditemukan." };
    if (v.type === "expense") {
      const [{ data: bw }, { data: bc }] = await Promise.all([
        sb.from("budget_wallets").select("wallet_id").eq("budget_id", v.budget_id), sb.from("budget_categories").select("category_id").eq("budget_id", v.budget_id)]);
      if ((bw?.length && !bw.some((r) => r.wallet_id === v.wallet_id)) || (bc?.length && !bc.some((r) => r.category_id === v.category_id)))
        return { ok: false, error: "Wallet atau kategori tidak sesuai dengan budget yang dipilih." };
    }
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

const Upd = z.object({ id: z.string().uuid(), date: z.string().date(), amount: z.coerce.number().positive().max(9_999_999_999_999), wallet_id: z.string().uuid(),
  to_wallet_id: z.string().uuid().nullable().optional(), category_id: z.string().uuid().nullable().optional(), note: z.string().max(200).optional(), budget_id: z.string().uuid().nullable().optional() });
export type UpdateTxInput = z.input<typeof Upd>;

/** Ubah transaksi yang sudah ada. Jenis transaksi tidak bisa diganti. Aturan budget sama dengan saveTx: wallet & kategori harus cocok. */
export async function updateTx(input: UpdateTxInput): Promise<Result> {
  const { sb, user, familyId, role } = await getCtx();
  if (!canWrite(role)) return { ok: false, error: "Viewer tidak dapat mengubah transaksi." };
  const p = Upd.safeParse(input);
  if (!p.success) return { ok: false, error: "Input tidak valid." };
  const v = p.data;
  const { data: cur } = await sb.from("transactions").select("id,type,created_by").eq("id", v.id).eq("family_id", familyId).is("deleted_at", null).maybeSingle();
  if (!cur) return { ok: false, error: "Transaksi tidak ditemukan." };
  if (!(role === "owner" || role === "admin" || cur.created_by === user.id)) return { ok: false, error: "Anda hanya dapat mengubah transaksi yang Anda buat." };
  if (cur.type === "transfer") {
    if (!v.to_wallet_id) return { ok: false, error: "Pilih wallet tujuan." };
    if (v.to_wallet_id === v.wallet_id) return { ok: false, error: "Wallet asal dan tujuan harus berbeda." };
  } else if (!v.category_id) return { ok: false, error: "Pilih kategori." };
  if (cur.type !== "income" && v.budget_id) {
    const { data: b } = await sb.from("budgets").select("id").eq("id", v.budget_id).eq("family_id", familyId).is("deleted_at", null).maybeSingle();
    if (!b) return { ok: false, error: "Budget tidak ditemukan." };
    if (cur.type === "expense") {
      const [{ data: bw }, { data: bc }] = await Promise.all([
        sb.from("budget_wallets").select("wallet_id").eq("budget_id", v.budget_id), sb.from("budget_categories").select("category_id").eq("budget_id", v.budget_id)]);
      if ((bw?.length && !bw.some((r) => r.wallet_id === v.wallet_id)) || (bc?.length && !bc.some((r) => r.category_id === v.category_id)))
        return { ok: false, error: "Wallet atau kategori tidak sesuai dengan budget yang dipilih." };
    }
  }
  const text = v.note?.trim() || null;
  const patch = cur.type === "transfer"
    ? { date: v.date, amount: v.amount, wallet_id: v.wallet_id, to_wallet_id: v.to_wallet_id, category_id: null, note: text, description: null, budget_id: v.budget_id ?? null }
    : { date: v.date, amount: v.amount, wallet_id: v.wallet_id, to_wallet_id: null, category_id: v.category_id, description: text, note: null, budget_id: cur.type === "expense" ? v.budget_id ?? null : null };
  const { error } = await sb.from("transactions").update({ ...patch, updated_by: user.id }).eq("id", v.id).eq("family_id", familyId);
  if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan perubahan." };
  revalidatePath("/", "layout");
  return { ok: true };
}
