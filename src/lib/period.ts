export type PeriodKey = "today" | "week" | "month" | "last_month" | "year" | "custom";
export const PERIODS: [PeriodKey, string][] = [["today","Hari ini"],["week","Minggu ini"],["month","Bulan ini"],["last_month","Bulan sebelumnya"],["year","Tahun ini"],["custom","Rentang kustom"]];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(s + "T00:00:00Z");
/** Tanggal hari ini di Asia/Jakarta (YYYY-MM-DD). */
export const todayJakarta = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(now);
export function resolvePeriod(key: string | undefined, from?: string, to?: string, today = todayJakarta()): { key: PeriodKey; from: string; to: string } {
  const t = utc(today), y = t.getUTCFullYear(), m = t.getUTCMonth();
  switch (key) {
    case "today": return { key, from: today, to: today };
    case "week": { const dow = (t.getUTCDay() + 6) % 7; const s = new Date(t); s.setUTCDate(t.getUTCDate() - dow); const e = new Date(s); e.setUTCDate(s.getUTCDate() + 6); return { key, from: iso(s), to: iso(e) }; }
    case "last_month": return { key, from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) };
    case "year": return { key, from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom": if (from && to && from <= to) return { key, from, to }; // fallthrough
    default: return { key: "month", from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) };
  }
}
/** Rentang budget dari tanggal acuan. */
export function budgetRange(type: "weekly" | "monthly" | "yearly", ref: string) {
  const r = resolvePeriod(type === "weekly" ? "week" : type === "monthly" ? "month" : "year", undefined, undefined, ref);
  return { start: r.from, end: r.to };
}
