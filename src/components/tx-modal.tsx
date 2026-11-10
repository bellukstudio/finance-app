"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveTx } from "@/app/(app)/actions";
import { Icon } from "./icons";

export type Opt = { id: string; name: string };
export type CatOpt = Opt & { type: string };
export type BudgetOpt = Opt & { start: string; end: string };
type Kind = "income" | "expense" | "transfer";
const TABS: { k: Kind; label: string; icon: "down" | "up" | "swap"; c: string }[] = [
  { k: "income", label: "Pemasukan", icon: "down", c: "var(--income)" }, { k: "expense", label: "Pengeluaran", icon: "up", c: "var(--expense)" }, { k: "transfer", label: "Transfer", icon: "swap", c: "var(--transfer)" }];
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function TxModal({ wallets, cats, budgets, onClose }: { wallets: Opt[]; cats: CatOpt[]; budgets: BudgetOpt[]; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState(""), [date, setDate] = useState(today()), [wallet, setWallet] = useState(wallets[0]?.id ?? ""), [to, setTo] = useState(wallets[1]?.id ?? wallets[0]?.id ?? "");
  const [cat, setCat] = useState(""), [budget, setBudget] = useState(""), [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null), [pending, start] = useTransition();
  const [idem] = useState(() => crypto.randomUUID());
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
      if (r.ok) onClose(); else setErr(r.error);
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
          <label className="fld"><span>Jumlah (Rp)</span><input className="amount" inputMode="numeric" placeholder="0" value={shown} autoFocus onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 13))} /></label>
          <div className="two">
            <label className="fld"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="fld"><span>{kind === "transfer" ? "Wallet asal" : "Wallet"}</span><select value={wallet} onChange={(e) => setWallet(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          </div>
          {kind === "transfer"
            ? <label className="fld"><span>Wallet tujuan</span><select value={to} onChange={(e) => setTo(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            : <label className="fld"><span>Kategori</span><select value={cat} onChange={(e) => setCat(e.target.value)} required>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {kind !== "income" && (
            <div className="alloc">
              <span className="lbl"><Icon n="target" />{kind === "expense" ? "Potong dari budget (opsional)" : "Tambah ke budget (opsional)"}</span>
              <select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">{kind === "expense" ? "Otomatis sesuai wallet & kategori" : "Tidak dialokasikan"}</option>
                {bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <small className="muted">{kind === "expense" ? "Jika dipilih, hanya budget ini yang terpotong, tidak bentrok dengan budget lain." : "Transfer menambah total budget yang dipilih."}</small>
              {!bl.length && <small className="muted">Belum ada budget pada tanggal ini.</small>}
            </div>
          )}
          <label className="fld"><span>Catatan</span><input value={note} maxLength={200} placeholder="Opsional…" onChange={(e) => setNote(e.target.value)} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="save" disabled={pending || !amount}><Icon n="save" /> {pending ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </div>
  );
}
