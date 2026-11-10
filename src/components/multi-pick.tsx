"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export type PickOpt = { id: string; name: string };
/** Pilih banyak item sebagai chip. Kosong = semua. */
export function MultiPick({ options, value, onChange, placeholder, label }: { options: PickOpt[]; value: string[]; onChange: (v: string[]) => void; placeholder: string; label: string }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const sel = options.filter((o) => value.includes(o.id));
  const rest = options.filter((o) => !value.includes(o.id) && o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mp" ref={ref}>
      <div className="mp-box" onClick={() => setOpen(true)}>
        {sel.map((o) => <span key={o.id} className="chip">{o.name}<button type="button" aria-label={`Hapus ${o.name}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== o.id)); }}>×</button></span>)}
        <input aria-label={label} value={q} placeholder={sel.length ? "" : placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1)); }} />
        <Icon n="chev" className="ico" />
      </div>
      {open && <div className="mp-list" role="listbox">
        {rest.length ? rest.map((o) => <button type="button" key={o.id} onClick={() => { onChange([...value, o.id]); setQ(""); }}>{o.name}</button>) : <p>{options.length ? "Tidak ada pilihan lain" : "Belum ada data"}</p>}
      </div>}
    </div>
  );
}
