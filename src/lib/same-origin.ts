import type { NextRequest } from "next/server";
export const sameOrigin = (req: NextRequest) => { const o = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host"); try { return !!o && !!host && new URL(o).host === host; } catch { return false; } };
