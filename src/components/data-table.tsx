"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "./icons";

export type DTCol = { key: string; header: string; align?: "right"; sortable?: boolean; wrap?: boolean };
/** `cells` = isi tampilan (boleh JSX/form server action); `sort` = nilai pembanding; `search` = teks yang dicari. */
export type DTRow = { id: string; cells: Record<string, ReactNode>; sort?: Record<string, string | number>; search?: string };
type Dir = "asc" | "desc";

/** Tabel interaktif: cari, urut, pagination, pilih jumlah baris. Semua dikerjakan di klien dari data yang sudah dimuat server. */
export function DataTable({ columns, rows, label, pageSize = 10, searchable = true, placeholder = "Cari…", empty = "Tidak ada data.", defaultSort }: {
  columns: DTCol[]; rows: DTRow[]; label: string; pageSize?: number; searchable?: boolean; placeholder?: string; empty?: string; defaultSort?: { key: string; dir: Dir };
}) {
  const [q, setQ] = useState(""), [size, setSize] = useState(pageSize), [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: Dir } | null>(defaultSort ?? null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => (r.search ?? "").toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const k = sort.key, m = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = a.sort?.[k] ?? "", y = b.sort?.[k] ?? "";
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id", { numeric: true })) * m;
    });
  }, [filtered, sort]);

  if (!rows.length) return <p className="muted">{empty}</p>;
  const pages = Math.max(1, Math.ceil(sorted.length / size)), cur = Math.min(page, pages);
  const from = sorted.length ? (cur - 1) * size + 1 : 0, to = Math.min(cur * size, sorted.length);
  const view = sorted.slice((cur - 1) * size, cur * size);
  const showBar = searchable && rows.length > 8;
  const toggle = (key: string) => { setPage(1); setSort((s) => (s?.key === key && s.dir === "asc" ? { key, dir: "desc" } : { key, dir: "asc" })); };

  return (
    <div className="dt">
      {showBar && <div className="dt-bar">
        <input className="dt-search" type="search" value={q} placeholder={placeholder} aria-label={`Cari di ${label}`} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span className="dt-count" aria-live="polite">{filtered.length} dari {rows.length} baris</span>
      </div>}
      <div className="dt-scroll">
        <table aria-label={label}>
          <thead><tr>{columns.map((c) => {
            const active = sort?.key === c.key;
            return <th key={c.key} scope="col" className={c.align === "right" ? "r" : undefined} aria-sort={active && sort ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined}>
              {c.sortable ? <button type="button" className="dt-sort" onClick={() => toggle(c.key)}>{c.header}<Icon n="chev" /></button> : c.header}
            </th>;
          })}</tr></thead>
          <tbody>
            {view.map((r) => <tr key={r.id}>{columns.map((c) => <td key={c.key} className={[c.align === "right" ? "r" : "", c.wrap ? "wrap" : ""].filter(Boolean).join(" ") || undefined}>{r.cells[c.key]}</td>)}</tr>)}
            {!view.length && <tr><td colSpan={columns.length} className="dt-empty">Tidak ada hasil untuk “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
      {(sorted.length > Math.min(size, 10) || pages > 1) && <div className="dt-foot">
        <span className="dt-count">{from}–{to} dari {sorted.length}</span>
        <div className="dt-pg">
          <select aria-label="Baris per halaman" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / hal</option>)}</select>
          <button type="button" className="ghost sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label="Halaman sebelumnya"><Icon n="left" /></button>
          <span className="dt-count">{cur} / {pages}</span>
          <button type="button" className="ghost sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label="Halaman berikutnya"><Icon n="right" /></button>
        </div>
      </div>}
    </div>
  );
}
