/** Escape CSV + cegah formula injection di Excel. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (r: unknown[]) => r.map(csvCell).join(",");
export const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");
