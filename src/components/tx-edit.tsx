"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTx } from "@/app/(app)/actions";
import { Icon } from "./icons";
import { showToast } from "@/lib/toast";

type Opt = { id: string; name: string };
export type EditCat = Opt & { type: string };
export type EditBudget = Opt & { start: string; end: string; wallet_ids: string[]; category_ids: string[] };
export type EditTx = { id: string; type: string; date: string; amount: number | string; wallet_id: string; to_wallet_id: string | null; category_id: string | null; budget_id: string | null; text: string };

/** Tombol "Edit" + popup ubah transaksi. Jenis transaksi tetap; wallet, kategori, budget, tanggal, jumlah & catatan bisa diubah. */
export function TxEdit({ tx, wallets, cats, budgets }: { tx: EditTx; wallets: Opt[]; cats: EditCat[]; budgets: EditBudget[] }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button type="button" className="ghost sm" onClick={() => setOpen(true)}><Icon n="edit" /> Edit</button>
    {open && <EditModal tx={tx} wallets={wallets} cats={cats} budgets={budgets} onClose={() => setOpen(false)} />}
  </>);
}

function EditModal({ tx, wallets, cats, budgets, onClose }: { tx: EditTx; wallets: Opt[]; cats: EditCat[]; budgets: EditBudget[]; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.round(Number(tx.amount)))), [date, setDate] = useState(tx.date);
  const [wallet, setWallet] = useState(tx.wallet_id), [to, setTo] = useState(tx.to_wallet_id ?? "");
  const [cat, setCat] = useState(tx.category_id ?? ""), [budget, setBudget] = useState(tx.budget_id ?? ""), [note, setNote] = useState(tx.text);
  const [err, setErr] = useState<string | null>(null), [pending, start] = useTransition();
  const kind = tx.type, isTransfer = kind === "transfer";
  const color = kind === "income" ? "var(--income)" : kind === "expense" ? "var(--expense)" : "var(--transfer)";
  const label = kind === "income" ? "Pemasukan" : kind === "expense" ? "Pengeluaran" : "Transfer";
  const catList = useMemo(() => cats.filter((c) => c.type === kind), [cats, kind]);
  // Pengeluaran: budget hanya yang tanggal, wallet & kategorinya cocok (daftar kosong = semua). Transfer: cukup tanggal.
  const bl = useMemo(() => budgets.filter((b) => date >= b.start && date <= b.end
    && (kind !== "expense" || ((!b.wallet_ids.length || b.wallet_ids.includes(wallet)) && (!b.category_ids.length || b.category_ids.includes(cat))))), [budgets, date, kind, wallet, cat]);
  useEffect(() => { if (budget && !bl.some((b) => b.id === budget)) setBudget(""); }, [bl, budget]);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const shown = amount ? new Intl.NumberFormat("id-ID").format(Number(amount)) : "";
  function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!amount || Number(amount) <= 0) return setErr("Isi jumlah lebih dari 0.");
    if (isTransfer && wallet === to) return setErr("Wallet asal dan tujuan harus berbeda.");
    start(async () => {
      const r = await updateTx({ id: tx.id, date, amount: Number(amount), wallet_id: wallet, to_wallet_id: isTransfer ? to : null, category_id: isTransfer ? null : cat, note, budget_id: kind === "income" ? null : budget || null });
      if (!r.ok) return setErr(r.error);
      showToast("Transaksi berhasil diperbarui.");
      onClose(); router.refresh();
    });
  }
  return (
    <div className="mb" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label="Edit transaksi" onSubmit={submit} style={{ ["--c" as string]: color }}>
        <header><h2>Edit {label}</h2><button type="button" className="x" aria-label="Tutup" onClick={onClose}><Icon n="x" /></button></header>
        <div className="body">
          <label className="fld"><span>Jumlah (Rp)</span><input className="amount" inputMode="numeric" placeholder="0" value={shown} autoFocus onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></label>
          <div className="two">
            <label className="fld"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="fld"><span>{isTransfer ? "Wallet asal" : "Wallet"}</span><select value={wallet} onChange={(e) => setWallet(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          </div>
          {isTransfer
            ? <label className="fld"><span>Wallet tujuan</span><select value={to} onChange={(e) => setTo(e.target.value)} required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            : <label className="fld"><span>Kategori</span><select value={cat} onChange={(e) => setCat(e.target.value)} required>{catList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {kind !== "income" && <div className="alloc">
            <span className="lbl"><Icon n="target" />{kind === "expense" ? "Potong dari budget (opsional)" : "Tambah ke budget (opsional)"}</span>
            <select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option value="">{kind === "expense" ? "Otomatis sesuai wallet & kategori" : "Tidak dialokasikan"}</option>
              {bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <small className="muted">{kind === "expense" ? "Hanya budget yang wallet & kategorinya cocok yang tampil." : "Transfer menambah total budget yang dipilih."}</small>
          </div>}
          <label className="fld"><span>Catatan</span><input value={note} maxLength={200} placeholder="Opsional…" onChange={(e) => setNote(e.target.value)} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="save" disabled={pending || !amount}><Icon n="save" /> {pending ? "Menyimpan…" : "Simpan perubahan"}</button>
        </div>
      </form>
    </div>
  );
}
