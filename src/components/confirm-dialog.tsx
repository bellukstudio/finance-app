"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export type ConfirmProps = {
  title: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>; onCancel: () => void;
};

/** Dialog konfirmasi pengganti window.confirm. Fokus awal di "Batal" agar tidak terhapus tak sengaja; Esc membatalkan. */
export function ConfirmDialog({ title, message, confirmLabel = "Ya, lanjutkan", cancelLabel = "Batal", tone = "default", onConfirm, onCancel }: ConfirmProps) {
  const [busy, setBusy] = useState(false), cancelRef = useRef<HTMLButtonElement>(null), dlg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) { e.stopPropagation(); onCancel(); }
      if (e.key === "Tab" && dlg.current) { // fokus tetap di dalam dialog
        const f = [...dlg.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!f.length) return; const first = f[0]!, last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", h, true);
    return () => { window.removeEventListener("keydown", h, true); prev?.focus?.(); };
  }, [busy, onCancel]);
  async function go() { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }
  return (
    <div className="mb cf-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className={`modal cf ${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby={message ? "cf-m" : undefined} ref={dlg}>
        <div className="cf-ico" aria-hidden="true"><Icon n={tone === "danger" ? "trash" : "alert"} /></div>
        <h2 id="cf-t">{title}</h2>
        {message && <p id="cf-m" className="muted">{message}</p>}
        <div className="cf-act">
          <button type="button" className="ghost" ref={cancelRef} disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={tone === "danger" ? "cf-danger" : ""} disabled={busy} onClick={go}>{busy ? "Memproses…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
