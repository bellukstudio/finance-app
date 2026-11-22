"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Toast = { message: string; id: number };

export function ToastHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const message = searchParams.get("toast");
    if (!message) return;
    setToast({ message, id: Date.now() });
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      if (message) setToast({ message, id: Date.now() });
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", top: "max(16px, env(safe-area-inset-top))", right: 16, zIndex: 1000,
      display: "flex", alignItems: "center", gap: 10, maxWidth: "min(420px, calc(100vw - 32px))",
      padding: "12px 16px", borderRadius: 12, color: "var(--text)", background: "var(--surface)",
      border: "1px solid color-mix(in srgb, var(--income) 45%, var(--line))",
      boxShadow: "0 12px 36px rgb(0 0 0 / .22)", fontSize: 13, fontWeight: 650
    }}>
      <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 22, height: 22, flex: "0 0 22px", borderRadius: "50%", color: "#fff", background: "var(--income)" }}>✓</span>
      <span>{toast.message}</span>
      <button type="button" aria-label="Tutup notifikasi" onClick={() => setToast(null)} style={{ marginLeft: 6, padding: 2, background: "transparent", color: "var(--muted)" }}>×</button>
    </div>
  );
}
