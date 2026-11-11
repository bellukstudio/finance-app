"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryPie, IncomeExpenseChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { TxRow, type TxRowData } from "@/components/tx-row";
import { rupiah } from "@/lib/format";

type Tx = TxRowData & { budget_id: string | null; debt_payment_id?: string | null };
type Category = { id?: string; name: string; value: number };
type Wallet = { wallet_id: string; name: string; balance: number };
type Row = Record<string, string | number>;
type Alert = { name: string; total: number; used: number; pct: number };
type Detail = { key: string; title: string; items: Tx[]; total?: number; href?: string };
type Props = {
  ledger: "family" | "personal";
  monthLabel: string;
  year: number;
  month: number;
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  transfers: number;
  transferCount: number;
  payable: number;
  receivable: number;
  alerts: Alert[];
  transactions: Tx[];
  recent: Tx[];
  categories: { id: string; name: string }[];
  budgets: { id: string; name: string }[];
  categoryTotals: Category[];
  series: Row[];
  wallets: Wallet[];
  totalBalance: number;
};
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
};
const sum = (items: Tx[]) => items.reduce((a, t) => a + Number(t.amount), 0);

export function DashboardInteractions(props: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const catMap = useMemo(() => new Map(props.categories.map((c) => [c.id, c.name])), [props.categories]);
  const walletMap = useMemo(() => new Map(props.wallets.map((w) => [w.wallet_id, w.name])), [props.wallets]);
  const budgetMap = useMemo(() => new Map(props.budgets.map((b) => [b.id, b.name])), [props.budgets]);
  const maps = { wallets: walletMap, cats: catMap, budgets: budgetMap };

  // Setelah panel muncul, gulir agar daftar transaksi langsung terlihat (penting di mobile).
  useEffect(() => { if (detail) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [detail?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (d: Detail) => setDetail((cur) => (cur?.key === d.key ? null : d));
  const qs = `from=${props.from}&to=${props.to}`;
  const incomeTx = props.transactions.filter((t) => t.type === "income");
  const expenseTx = props.transactions.filter((t) => t.type === "expense");
  const transferTx = props.transactions.filter((t) => t.type === "transfer");

  const tile = (key: string, label: string, amount: number, color: string, icon: Parameters<typeof Icon>[0]["n"], subtitle: string, d: Omit<Detail, "key">) => (
    <button type="button" key={key} className="sc" style={{ ["--c" as string]: color }} aria-expanded={detail?.key === key} onClick={() => choose({ key, ...d })}>
      <span className="ic"><Icon n={icon} /></span><small className="muted">{label}</small><b>{rupiah(amount)}</b><small className="muted">{subtitle}</small>
    </button>
  );

  const panel = (d: Detail, closeLabel: string) => (
    <div ref={panelRef} className="dpanel">
      <div className="between">
        <div><b>{d.title}</b>
          <small className="muted" style={{ display: "block" }}>{d.total !== undefined && <>Total: <b className="mono">{rupiah(d.total)}</b> · </>}{d.items.length} transaksi</small></div>
        <button type="button" className="x" aria-label={closeLabel} onClick={() => setDetail(null)}><Icon n="x" /></button>
      </div>
      <div className="dg dlist">
        {!d.items.length ? <p className="muted">Tidak ada transaksi.</p> : d.items.map((t) => <TxRow key={t.id} t={t} maps={maps} />)}
      </div>
      {d.href && <Link href={d.href} className="btn ghost sm" style={{ justifySelf: "start" }}>Buka di halaman Transaksi</Link>}
    </div>
  );

  const categories = props.categoryTotals;
  const bars = props.series.map((r) => ({ label: String(r.bucket).slice(8), income: Number(r.income), expense: Number(r.expense) }));
  const maxBal = Math.max(1, ...props.wallets.map((w) => Math.abs(Number(w.balance))));

  return <main>
    <div className="ph"><div className="l"><h1>{props.ledger === "personal" ? "Dashboard Pribadi" : "Dashboard"}</h1>
      <div className="mnav" role="group" aria-label="Pilih bulan">
        <Link href={`?m=${shift(props.year, props.month, -1)}`} aria-label="Bulan sebelumnya"><Icon n="left" /></Link>
        <span>{props.monthLabel}</span>
        <Link href={`?m=${shift(props.year, props.month, 1)}`} aria-label="Bulan berikutnya"><Icon n="right" /></Link>
      </div></div>
      {/* Tombol ini disembunyikan di mobile (sudah ada tombol + di tab bar bawah). */}
      <button type="button" className="dash-add" data-open-tx><Icon n="plus" /> Transaksi</button>
    </div>
    <div className="banners">
      {props.alerts.map((a) => a.pct >= 100
        ? <div key={a.name} className="banner red"><Icon n="alert" /><b>{a.name}</b> Budget habis! {rupiah(a.used)} / {rupiah(a.total)}</div>
        : <div key={a.name} className="banner amber"><Icon n="bell" /><b>{a.name}</b> {Math.round(a.pct)}% terpakai. Sisa {rupiah(a.total - a.used)}</div>)}
      <div className="banner info"><Icon n="hand" /><span>Utang: <b className="mono">{rupiah(props.payable)}</b></span><span>Piutang: <b className="mono">{rupiah(props.receivable)}</b></span></div>
    </div>
    <section className="grid g4">
      {tile("income", "Pemasukan", props.income, "var(--income)", "down", "Klik untuk detail", { title: "Detail Pemasukan", items: incomeTx, total: sum(incomeTx), href: `/transaksi?type=income&${qs}` })}
      {tile("expense", "Pengeluaran", props.expense, "var(--expense)", "up", props.income ? `${Math.round(props.expense / props.income * 100)}% dari pemasukan` : "Belum ada pemasukan", { title: "Detail Pengeluaran", items: expenseTx, total: sum(expenseTx), href: `/transaksi?type=expense&${qs}` })}
      {tile("net", "Selisih", props.net, props.net >= 0 ? "var(--warn)" : "var(--expense)", "scale", props.income ? `Saving rate ${Math.round(props.net / props.income * 100)}%` : "Saving rate -", { title: "Detail Selisih (pemasukan & pengeluaran)", items: [...incomeTx, ...expenseTx].sort((a, b) => b.date.localeCompare(a.date)) })}
      {tile("transfer", "Transfer", props.transfers, "var(--transfer)", "swap", `${props.transferCount} transaksi`, { title: "Detail Transfer", items: transferTx, total: sum(transferTx), href: `/transaksi?type=transfer&${qs}` })}
    </section>
    {detail && !detail.key.includes(":") && <section className="card" style={{ marginTop: 12 }}>{panel(detail, "Tutup detail")}</section>}
    <section className="grid g2e" style={{ marginTop: 16 }}>
      <div className="card"><h2>Per Kategori</h2>
        <CategoryPie data={categories} onCategoryClick={(c) => {
          const items = expenseTx.filter((t) => !t.debt_payment_id && (c.id ? t.category_id === c.id : catMap.get(t.category_id ?? "") === c.name));
          choose({ key: `category:${c.id ?? c.name}`, title: `Kategori: ${c.name}`, items, total: sum(items) });
        }} />
        {detail?.key.startsWith("category:") && <div style={{ marginTop: 12 }}>{panel(detail, "Tutup detail kategori")}</div>}
      </div>
      <div className="card"><h2>Tren Harian</h2>
        <IncomeExpenseChart data={bars} onBarClick={(kind, label) => {
          const date = `${props.year}-${pad(props.month)}-${pad(Number(label))}`;
          const items = props.transactions.filter((t) => t.date === date && t.type === kind);
          choose({ key: `day:${kind}:${date}`, title: `${kind === "income" ? "Pemasukan" : "Pengeluaran"} ${date}`, items, total: sum(items) });
        }} />
        {detail?.key.startsWith("day:") && <div style={{ marginTop: 12 }}>{panel(detail, "Tutup detail tanggal")}</div>}
      </div>
    </section>
    <section className="grid g2e" style={{ marginTop: 16 }}>
      <div className="card"><div className="between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Transaksi Terbaru</h2><Link href="/transaksi" className="btn ghost sm" style={{ padding: ".25rem .7rem" }}>Lihat semua</Link></div>
        {!props.recent.length ? <p className="muted">Belum ada transaksi.</p> : <div className="dg">{props.recent.map((t) => <TxRow key={t.id} t={t} maps={maps} />)}</div>}
      </div>
      <div className="card"><div className="between" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>Saldo per Wallet</h2><small className="muted mono">{rupiah(props.totalBalance)}</small></div>
        {!props.wallets.length ? <p className="muted">Belum ada dompet.</p> : props.wallets.map((w) => { const v = Number(w.balance); return <div key={w.wallet_id} className="wrow"><span>{w.name}</span><span className="t"><i style={{ width: `${Math.max(v > 0 ? 1.5 : 0, (Math.max(v, 0) / maxBal) * 100)}%` }} /></span><b className={v < 0 ? "neg" : ""}>{rupiah(v)}</b></div>; })}
      </div>
    </section>
  </main>;
}
