"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveTx } from "@/app/(app)/actions";
import { Icon } from "./icons";
import { ReceiptModal } from "./receipt-modal";
import { compressReceiptFile, formatBytes, type CompressionResult } from "@/lib/client-compress";

export type Opt = { id: string; name: string };
export type CatOpt = Opt & { type: string };
export type BudgetOpt = Opt & { start: string; end: string };
type Kind = "income" | "expense" | "transfer";
const TABS: { k: Kind; label: string; icon: "down" | "up" | "swap"; c: string }[] = [
  { k: "income", label: "Pemasukan", icon: "down", c: "var(--income)" },
  { k: "expense", label: "Pengeluaran", icon: "up", c: "var(--expense)" },
  { k: "transfer", label: "Transfer", icon: "swap", c: "var(--transfer)" },
];
const MAX_FILE = 4_000_000, OK_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function TxModal({ wallets, cats, budgets, onClose }: { wallets: Opt[]; cats: CatOpt[]; budgets: BudgetOpt[]; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState(""), [date, setDate] = useState(today()), [wallet, setWallet] = useState(wallets[0]?.id ?? ""), [to, setTo] = useState(wallets[1]?.id ?? wallets[0]?.id ?? "");
  const [cat, setCat] = useState(""), [budget, setBudget] = useState(""), [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null), [pending, start] = useTransition();
  const [idem] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null), [thumb, setThumb] = useState<string | null>(null), [saved, setSaved] = useState(false);
  const [compInfo, setCompInfo] = useState<CompressionResult | null>(null), [compressing, setCompressing] = useState(false);
  const [showPreview, setShowPreview] = useState(false), [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setThumb(null); setPreviewUrl(null); return; }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    if (file.type.startsWith("image/")) setThumb(u);
    else setThumb(null);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  async function pick(f: File | undefined) {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setErr("Tipe file tidak didukung (JPEG, PNG, WebP, PDF).");
    if (f.size > MAX_FILE) return setErr("Ukuran file maksimal 4 MB.");
    setErr(null); setCompressing(true);
    try {
      const res = await compressReceiptFile(f);
      setCompInfo(res); setFile(res.file);
    } catch {
      setCompInfo(null); setFile(f);
    } finally { setCompressing(false); }
  }
  const list = useMemo(() => cats.filter((c) => c.type === kind), [cats, kind]);
  const bl = useMemo(() => budgets.filter((b) => date >= b.start && date <= b.end), [budgets, date]);
  useEffect(() => { setCat(list[0]?.id ?? ""); }, [list]);
  useEffect(() => { if (budget && !bl.some((b) => b.id === budget)) setBudget(""); }, [bl, budget]);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const shown = amount ? new Intl.NumberFormat("id-ID").format(Number(amount)) : "";
  const tab = TABS.find((t) => t.k === kind)!;
  function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!amount || Number(amount) <= 0) return setErr("Isi jumlah lebih dari 0.");
    if (kind === "transfer" && wallet === to) return setErr("Wallet asal dan tujuan harus berbeda.");
    start(async () => {
      const base = { date, amount: Number(amount), wallet_id: wallet, note, budget_id: budget || null, idem };
      const r = await saveTx(kind === "transfer" ? { ...base, type: "transfer", to_wallet_id: to } : { ...base, type: kind, category_id: cat });
      if (!r.ok) return setErr(r.error);
      if (!file || !r.id) return onClose();
      try {
        const fd = new FormData(); fd.set("transaction_id", r.id); fd.set("file", file);
        const res = await fetch("/api/attachments", { method: "POST", body: fd, headers: { "x-json": "1" } });
        const j = await res.json().catch(() => null) as { ok?: boolean; message?: string } | null;
        if (res.ok && j?.ok) return onClose();
        setErr(`Transaksi tersimpan, tetapi nota gagal diunggah: ${j?.message ?? "kesalahan jaringan"}. Anda bisa mengunggahnya lagi dari daftar transaksi.`);
      } catch { setErr("Transaksi tersimpan, tetapi nota gagal diunggah (kesalahan jaringan). Anda bisa mengunggahnya lagi dari daftar transaksi."); }
      setSaved(true);
    });
  }
  return (
    <div className="mb" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label="Catat transaksi" onSubmit={submit} style={{ ["--c" as string]: tab.c }}>
        <header><h2>Catat Transaksi</h2><button type="button" className="x" aria-label="Tutup" onClick={onClose}><Icon n="x" /></button></header>
        <div className="body">
          <div className="tabs3" role="group" aria-label="Jenis transaksi">
            {TABS.map((t) => <button type="button" key={t.k} aria-pressed={kind === t.k} style={{ ["--c" as string]: t.c }} onClick={() => setKind(t.k)}><Icon n={t.icon} /> {t.label}</button>)}
          </div>
          <label className="fld"><span>Jumlah (Rp)</span><input className="amount" inputMode="numeric" placeholder="0" value={shown} autoFocus onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></label>
          <div className="two">
            <label className="fld"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="fld"><span>{kind === "transfer" ? "Wallet asal" : "Wallet"}</span><select value={wallet} onChange={(e) => setWallet(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          </div>
          {kind === "transfer"
            ? <label className="fld"><span>Wallet tujuan</span><select value={to} onChange={(e) => setTo(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            : <label className="fld"><span>Kategori</span><select value={cat} onChange={(e) => setCat(e.target.value)} required>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {kind !== "income" && <div className="alloc">
            <span className="lbl"><Icon n="target" />{kind === "expense" ? "Potong dari budget (opsional)" : "Tambah ke budget (opsional)"}</span>
            <select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option value="">{kind === "expense" ? "Otomatis sesuai wallet & kategori" : "Tidak dialokasikan"}</option>
              {bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <small className="muted">{kind === "expense" ? "Jika dipilih, hanya budget ini yang terpotong, tidak bentrok dengan budget lain." : "Transfer menambah total budget yang dipilih."}</small>
            {!bl.length && <small className="muted">Belum ada budget pada tanggal ini.</small>}
          </div>}
          <label className="fld"><span>Catatan</span><input value={note} maxLength={200} placeholder="Opsional…" onChange={(e) => setNote(e.target.value)} /></label>
          <div className="fld"><span>Nota (opsional)</span>
            <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            {compressing ? (
              <div className="nota-compress-bar">
                <span className="spinner-sm" />
                <span>Mengompresi file nota…</span>
              </div>
            ) : file ? (
              <div className="nota">
                <button
                  type="button"
                  className="nota-thumb-btn"
                  onClick={() => setShowPreview(true)}
                  title="Klik untuk membuka popup pratinjau nota"
                >
                  {thumb ? <img src={thumb} alt="Pratinjau nota" /> : <span className="nota-ico"><Icon n="fileText" /></span>}
                </button>
                <span className="nota-t" onClick={() => setShowPreview(true)} style={{ cursor: "pointer" }}>
                  <b>{file.name}</b>
                  <small className="muted">
                    {compInfo?.isCompressed
                      ? `Terkompresi: ${formatBytes(compInfo.originalSize)} → ${formatBytes(compInfo.compressedSize)} (-${compInfo.savedPercent}%)`
                      : file.type === "application/pdf"
                      ? `${formatBytes(file.size)} • PDF (optimasi cloud)`
                      : formatBytes(file.size)}
                  </small>
                </span>
                <button
                  type="button"
                  className="ib"
                  onClick={() => setShowPreview(true)}
                  title="Buka popup pratinjau nota"
                  aria-label="Buka popup pratinjau nota"
                >
                  <Icon n="eye" />
                </button>
                <button
                  type="button"
                  className="ib del"
                  aria-label="Hapus nota"
                  disabled={pending || saved}
                  onClick={() => { setFile(null); setCompInfo(null); }}
                >
                  <Icon n="trash" />
                </button>
              </div>
            ) : (
              <button type="button" className="ghost upl" onClick={() => fileRef.current?.click()}>
                <Icon n="plus" /> Pilih foto atau PDF nota
              </button>
            )}
            <small className="muted">JPEG, PNG, WebP, atau PDF (maks 4 MB). Otomatis dikompresi sebelum diunggah.</small>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          {saved ? <button type="button" className="save" onClick={onClose}>Selesai</button>
            : <button className="save" disabled={pending || !amount} style={{ opacity: 1, filter: "none" }}><Icon n="save" /> {pending ? (file ? "Menyimpan & mengunggah…" : "Menyimpan…") : "Simpan"}</button>}
        </div>
      </form>

      {showPreview && previewUrl && file && (
        <ReceiptModal
          url={previewUrl}
          filename={file.name}
          mimeType={file.type}
          sizeBytes={file.size}
          title={note || "Pratinjau Nota"}
          amount={amount}
          date={date}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
