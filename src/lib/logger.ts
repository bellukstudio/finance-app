export function log(level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) {
  console[level](JSON.stringify({ level, msg, t: new Date().toISOString(), ...extra }));  // tampil di Vercel Logs
}
