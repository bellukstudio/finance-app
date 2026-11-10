export const remaining = (principal: number, payments: number[]) => Math.max(0, principal - payments.reduce((a, b) => a + b, 0));
export type DebtStatus = "lunas" | "terlambat" | "jatuh_tempo_dekat" | "berjalan";
export function debtStatus(rem: number, due: string | null, today: string, soonDays = 7): DebtStatus {
  if (rem <= 0) return "lunas"; if (!due) return "berjalan"; if (due < today) return "terlambat";
  const diff = (Date.parse(due) - Date.parse(today)) / 86400000; return diff <= soonDays ? "jatuh_tempo_dekat" : "berjalan";
}
export const DEBT_LABEL: Record<DebtStatus, string> = { lunas: "Lunas", terlambat: "Terlambat", jatuh_tempo_dekat: "Jatuh tempo ≤7 hari", berjalan: "Berjalan" };
/** Net worth = saldo dompet + aset − utang (piutang tidak dihitung agar tidak ganda dengan saldo). */
export const netWorth = (walletTotal: number, assets: number, debts: number) => walletTotal + assets - debts;
/** Validasi magic bytes: JPEG, PNG, WebP, PDF. */
export function sniffMime(b: Uint8Array): string | null {
  const s = (o: number, t: string) => [...t].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && s(1, "PNG")) return "image/png";
  if (s(0, "RIFF") && s(8, "WEBP")) return "image/webp";
  if (s(0, "%PDF")) return "application/pdf";
  return null;
}
