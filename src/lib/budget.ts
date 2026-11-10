export type BudgetStatus = "aman" | "warning" | "critical" | "over";
export const budgetPercent = (used: number, budget: number) => (budget > 0 ? (used / budget) * 100 : 0);
/** Aman <70%, Warning 70–<90%, Critical 90–100%, Over >100%. */
export function budgetStatus(used: number, budget: number): BudgetStatus {
  const p = budgetPercent(used, budget);
  if (p > 100) return "over"; if (p >= 90) return "critical"; if (p >= 70) return "warning"; return "aman";
}
export const STATUS_LABEL: Record<BudgetStatus, string> = { aman: "Aman", warning: "Warning", critical: "Critical", over: "Over Budget" };
