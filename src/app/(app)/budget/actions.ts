"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCtx, canManage } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import type { Result } from "../actions";

const B = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1, "Nama budget wajib diisi.").max(80),
  month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2100), amount: z.coerce.number().positive("Total budget harus lebih dari 0.").max(9_999_999_999_999),
  wallet_ids: z.array(z.string().uuid()).max(100), category_ids: z.array(z.string().uuid()).max(100) });
export type BudgetInput = z.input<typeof B>;
const pad = (n: number) => String(n).padStart(2, "0");

export async function saveBudget(input: BudgetInput): Promise<Result> {
  const { sb, user, familyId, role } = await getCtx();
  if (!canManage(role)) return { ok: false, error: "Hanya Owner/Admin." };
  const p = B.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Input tidak valid." };
  const v = p.data;
  if (!v.wallet_ids.length && !v.category_ids.length) return { ok: false, error: "Pilih minimal satu wallet atau kategori." };
  const start = `${v.year}-${pad(v.month)}-01`, end = new Date(Date.UTC(v.year, v.month, 0)).toISOString().slice(0, 10);
  const row = { name: v.name, scope: "multi", category_id: null, wallet_id: null, period_type: "monthly", start_date: start, end_date: end, amount: v.amount, updated_by: user.id };
  let id = v.id;
  if (id) {
    const { error } = await sb.from("budgets").update(row).eq("id", id).is("deleted_at", null);
    if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan." };
    await sb.from("budget_wallets").delete().eq("budget_id", id); await sb.from("budget_categories").delete().eq("budget_id", id);
  } else {
    const { data, error } = await sb.from("budgets").insert({ ...row, family_id: familyId, created_by: user.id }).select("id").single();
    if (error || !data) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan." };
    id = data.id;
  }
  if (v.wallet_ids.length) { const { error } = await sb.from("budget_wallets").insert(v.wallet_ids.map((w) => ({ budget_id: id!, wallet_id: w, family_id: familyId }))); if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan wallet." }; }
  if (v.category_ids.length) { const { error } = await sb.from("budget_categories").insert(v.category_ids.map((c) => ({ budget_id: id!, category_id: c, family_id: familyId }))); if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menyimpan kategori." }; }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeBudget(id: string): Promise<Result> {
  const { sb, user, role } = await getCtx();
  if (!canManage(role)) return { ok: false, error: "Hanya Owner/Admin." };
  const { error } = await sb.from("budgets").update({ deleted_at: new Date().toISOString(), updated_by: user.id }).eq("id", id);
  if (error) return { ok: false, error: pgMessage(error) ?? "Gagal menghapus." };
  revalidatePath("/", "layout");
  return { ok: true };
}
