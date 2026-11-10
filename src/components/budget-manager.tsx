"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { removeBudget, saveBudget } from "@/app/(app)/budget/actions";
import { budgetPercent, budgetStatus } from "@/lib/budget";
import { rupiah } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { Icon } from "./icons";
import { MultiPick, type PickOpt } from "./multi-pick";

export type BudgetView = { id: string; name: string; amount: number; used: number; topup: number; start: string; end: string; month: number; year: number; wallet_ids: string[]; category_ids: string[] };
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function BudgetModal({ initial, wallets, cats, today, onClose }: { initial: BudgetView | null; wallets: PickOpt[]; cats: PickOpt[]; today: string; onClose: () => void }) {
  const [y0, m0] = today.split("-").map(Number);
  const [name, setName] = useState(initial?.name ?? ""), [month, setMonth] = useState(initial?.month ?? m0), [year, setYear] = useState(String(initial?.year ?? y0));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : ""), [ws, setWs] = useState(initial?.wallet_ids ?? []), [cs, setCs] = useState(initial?.category_ids ?? []);
  const [err, setErr] = useState<string | null>(null), [pending, start] = useTransition();
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    start(async () => { const r = await saveBudget({ id: initial?.id, name, month, year: Number(year), amount: Number(amount), wallet_ids: ws, category_ids: cs }); if (r.ok) onClose(); else setErr(r.error); });
  }
  return (
    <div className="mb" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={initial ? "Ubah budget" : "Tambah budget"} onSubmit={submit}>
        <header><h2>{initial ? "Ubah Budget" : "Tambah Budget"}</h2><button type="button" className="x" aria-label="Tutup" onClick={onClose}><Icon n="x" /></button></header>
        <div className="body">
          <label className="fld"><span>Nama budget</span><input value={name} maxLength={80} placeholder="Contoh: Budget Makan Bulanan" onChange={(e) => setName(e.target.value)} required autoFocus /></label>
          <div className="two">
            <label className="fld"><span>Bulan</span><select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <label className="fld"><span>Tahun</span><input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} required /></label>
          </div>
          <label className="fld"><span>Total budget (Rp)</span><input className="amount" inputMode="numeric" placeholder="0" value={amount ? new Intl.NumberFormat("id-ID").format(Number(amount)) : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 13))} required /></label>
          <div className="sect"><span className="lbl"><Icon n="wallet" />Wallet sumber</span><MultiPick label="Wallet sumber" placeholder="Pilih wallet…" options={wallets} value={ws} onChange={setWs} /></div>
          <div className="sect"><span className="lbl"><Icon n="tag" />Kategori pengeluaran</span><MultiPick label="Kategori pengeluaran" placeholder="Pilih kategori…" options={cats} value={cs} onChange={setCs} /></div>
          <small className="muted">Pengeluaran yang cocok dengan wallet dan kategori ini otomatis terpotong. Jika salah satu dikosongkan, semua wallet/kategori dihitung.</small>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="save" disabled={pending || !amount || !name.trim()}><Icon n="save" /> {pending ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </div>
  );
}

export function BudgetManager({ budgets, wallets, cats, canEdit, history, today }: { budgets: BudgetView[]; wallets: PickOpt[]; cats: PickOpt[]; canEdit: boolean; history: boolean; today: string }) {
  const [modal, setModal] = useState<{ b: BudgetView | null } | null>(null), [open, setOpen] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const wn = new Map(wallets.map((w) => [w.id, w.name])), cn = new Map(cats.map((c) => [c.id, c.name]));
  const [toDel, setToDel] = useState<BudgetView | null>(null);
  const del = async (b: BudgetView) => { const r = await removeBudget(b.id); setToDel(null); if (!r.ok) setErr(r.error); };
  return (
    <main>
      <div className="ph"><div><h1>Budget</h1><small>Monitor pengeluaran</small></div>
        <div className="toolbar"><div className="seg2"><Link href="/budget" aria-current={history ? undefined : "page"}>Aktif</Link><Link href="/budget?history=1" aria-current={history ? "page" : undefined}>Riwayat</Link></div>
          {canEdit && <button type="button" onClick={() => setModal({ b: null })}><Icon n="plus" /> Budget</button>}</div></div>
      {err && <p role="alert">{err}</p>}
      {!budgets.length ? <p className="muted">{history ? "Belum ada riwayat budget." : "Belum ada budget aktif. Buat budget untuk memantau batas pengeluaran per bulan."}</p> : (
        <div className="blist">{budgets.map((b) => {
          const total = b.amount + b.topup, left = total - b.used, pc = budgetPercent(b.used, total), st = budgetStatus(b.used, total);
          return (
            <article key={b.id} className="bcard" data-st={st}>
              <div className="top">
                <div><b>{b.name}</b><br /><small>{MONTHS[b.month - 1]} {b.year}</small></div>
                <div className="toolbar"><span className="pct">{Math.round(pc)}%</span>
                  <span className="ibs">
                    <button type="button" className="ib" aria-label="Lihat rincian" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}><Icon n="eye" /></button>
                    {canEdit && <><button type="button" className="ib" aria-label="Ubah budget" onClick={() => setModal({ b })}><Icon n="edit" /></button>
                      <button type="button" className="ib del" aria-label="Hapus budget" onClick={() => { setErr(null); setToDel(b); }}><Icon n="trash" /></button></>}
                  </span></div>
              </div>
              <div className="row2"><span className="used">{rupiah(b.used)} terpakai</span><small className="mono">dari {rupiah(total)}</small></div>
              <div className="bar" role="progressbar" aria-label={`${b.name} terpakai`} aria-valuenow={Math.round(Math.min(100, pc))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, pc)}%` }} /></div>
              <div className="chips">
                {b.wallet_ids.length ? b.wallet_ids.map((id) => <span key={id} className="chip"><Icon n="wallet" />{wn.get(id) ?? "Wallet"}</span>) : <span className="chip"><Icon n="wallet" />Semua wallet</span>}
                {b.category_ids.length ? b.category_ids.map((id) => <span key={id} className="chip"><Icon n="tag" />{cn.get(id) ?? "Kategori"}</span>) : <span className="chip"><Icon n="tag" />Semua kategori</span>}
              </div>
              <div className="row2"><small>{left >= 0 ? "Sisa:" : "Lebih:"} <b className={left >= 0 ? "inc mono" : "exp mono"}>{rupiah(Math.abs(left))}</b></small>
                {b.topup > 0 && <span className="topup mono">+{rupiah(b.topup)} dari transfer</span>}</div>
              {open === b.id && (
                <dl className="mono" style={{ margin: 0, display: "grid", gridTemplateColumns: "auto auto", justifyContent: "space-between", gap: "4px 16px", fontSize: ".8rem", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                  <dt className="muted">Anggaran awal</dt><dd style={{ margin: 0, textAlign: "right" }}>{rupiah(b.amount)}</dd>
                  <dt className="muted">Tambahan transfer</dt><dd style={{ margin: 0, textAlign: "right" }} className="trf">{rupiah(b.topup)}</dd>
                  <dt className="muted">Total budget</dt><dd style={{ margin: 0, textAlign: "right" }}>{rupiah(total)}</dd>
                  <dt className="muted">Terpakai</dt><dd style={{ margin: 0, textAlign: "right" }} className="exp">{rupiah(b.used)}</dd>
                  <dt className="muted">Periode</dt><dd style={{ margin: 0, textAlign: "right" }}>{b.start} s/d {b.end}</dd>
                </dl>)}
            </article>);
        })}</div>)}
      {toDel && <ConfirmDialog tone="danger" title={`Hapus budget "${toDel.name}"?`} message="Budget ini akan dihapus dari daftar. Transaksi yang sudah tercatat tidak ikut terhapus." confirmLabel="Hapus budget" onCancel={() => setToDel(null)} onConfirm={() => del(toDel)} />}
      {modal && <BudgetModal initial={modal.b} wallets={wallets} cats={cats} today={today} onClose={() => setModal(null)} />}
    </main>
  );
}
