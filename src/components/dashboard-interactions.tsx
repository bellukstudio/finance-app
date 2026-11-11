"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryPie, IncomeExpenseChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { TxRow, type TxRowData } from "@/components/tx-row";
import { rupiah } from "@/lib/format";

type Tx = TxRowData & { budget_id: string | null };
type Category = { name: string; value: number };
type Wallet = { wallet_id: string; name: string; balance: number };
type Row = Record<string, string | number>;
type Props = {
  ledger: "family" | "personal";
  monthLabel: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
  transfers: number;
  transferCount: number;
  transactions: Tx[];
  categories: { id: string; name: string }[];
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

export function DashboardInteractions(props: Props) {
  const [detail, setDetail] = useState<{ key: string; title: string; items: Tx[] } | null>(null);
  const catMap = useMemo(() => new Map(props.categories.map((cat) => [cat.id, cat.name])), [props.categories]);
  const walletMap = useMemo(() => new Map(props.wallets.map((wallet) => [wallet.wallet_id, wallet.name])), [props.wallets]);
  const budgetMap = useMemo(() => new Map<string, string>(), []);
  const maps = { wallets: walletMap, cats: catMap, budgets: budgetMap };
  const choose = (key: string, title: string, items: Tx[]) => setDetail((current) => current?.key === key ? null : { key, title, items });
  const tile = (key: string, label: string, amount: number, color: string, icon: Parameters<typeof Icon>[0]["n"], subtitle: string, items: Tx[]) => (
    <button type="button" key={key} className="sc" style={{ ["--c" as string]: color }} aria-expanded={detail?.key === key} onClick={() => choose(key, `Detail ${label}`, items)}>
      <span className="ic"><Icon n={icon} /></span><small className="muted">{label}</small><b>{rupiah(amount)}</b><small className="muted">{subtitle}</small>
    </button>
  );
  const showTransactions = (items: Tx[], title: string) => (
    <div className="dg" aria-label={title}>
      {!items.length ? <p className="muted">Tidak ada transaksi.</p> : items.map((tx) => <TxRow key={tx.id} t={tx} maps={maps} />)}
    </div>
  );
  const incomeTx = props.transactions.filter((tx) => tx.type === "income");
  const expenseTx = props.transactions.filter((tx) => tx.type === "expense");
  const transferTx = props.transactions.filter((tx) => tx.type === "transfer");
  const categoryDetail = (name: string) => props.transactions.filter((tx) => tx.type === "expense" && catMap.get(tx.category_id ?? "") === name);
  const categories = props.categoryTotals.map((category) => ({ ...category, href: undefined }));
  const bars = props.series.map((row) => ({ label: String(row.bucket).slice(8), income: Number(row.income), expense: Number(row.expense) }));

  return <main>
    <div className="ph"><div className="l"><h1>{props.ledger === "personal" ? "Dashboard Pribadi" : "Dashboard"}</h1>
      <div className="mnav" role="group" aria-label="Pilih bulan">
        <Link href={`?m=${shift(props.year, props.month, -1)}`} aria-label="Bulan sebelumnya"><Icon n="left" /></Link>
        <span>{props.monthLabel}</span>
        <Link href={`?m=${shift(props.year, props.month, 1)}`} aria-label="Bulan berikutnya"><Icon n="right" /></Link>
      </div>
    </div></div>
    <section className="grid g4">
      {tile("income", "Pemasukan", props.income, "var(--income)", "down", "Klik untuk detail", incomeTx)}
      {tile("expense", "Pengeluaran", props.expense, "var(--expense)", "up", props.income ? `${Math.round(props.expense / props.income * 100)}% dari pemasukan` : "Belum ada pemasukan", expenseTx)}
      {tile("net", "Selisih", props.net, props.net >= 0 ? "var(--warn)" : "var(--expense)", "scale", props.income ? `Saving rate ${Math.round(props.net / props.income * 100)}%` : "Saving rate -", [...incomeTx, ...expenseTx])}
      {tile("transfer", "Transfer", props.transfers, "var(--transfer)", "swap", `${props.transferCount} transaksi`, transferTx)}
    </section>
    {detail && <section className="card" style={{ marginTop: 12 }}>
      <div className="between"><h2 style={{ margin: 0 }}>{detail.title}</h2><button type="button" className="icon-btn" aria-label="Tutup detail" onClick={() => setDetail(null)}><Icon n="x" /></button></div>
      <div style={{ marginTop: 10 }}>{showTransactions(detail.items, detail.title)}</div>
    </section>}
    <section className="grid g2e" style={{ marginTop: 16 }}>
      <div className="card"><h2>Per Kategori</h2>
        <CategoryPie data={categories} onCategoryClick={(category) => choose(`category:${category.name}`, `Pengeluaran: ${category.name}`, categoryDetail(category.name))} />
        {detail?.key.startsWith("category:") && <div style={{ marginTop: 12 }}><div className="between"><b>{detail.title}</b><button type="button" className="icon-btn" aria-label="Tutup detail kategori" onClick={() => setDetail(null)}><Icon n="x" /></button></div>{showTransactions(detail.items, detail.title)}</div>}
      </div>
      <div className="card"><h2>Tren Harian</h2>
        <IncomeExpenseChart data={bars} onBarClick={(kind, label) => {
          const day = Number(label);
          const date = `${props.year}-${pad(props.month)}-${pad(day)}`;
          const items = props.transactions.filter((tx) => tx.date === date && tx.type === kind);
          choose(`day:${kind}:${date}`, `${kind === "income" ? "Pemasukan" : "Pengeluaran"} ${date}`, items);
        }} />
        {detail?.key.startsWith("day:") && <div style={{ marginTop: 12 }}><div className="between"><b>{detail.title}</b><button type="button" className="icon-btn" aria-label="Tutup detail tanggal" onClick={() => setDetail(null)}><Icon n="x" /></button></div>{showTransactions(detail.items, detail.title)}</div>}
      </div>
    </section>
    <section className="grid g2e" style={{ marginTop: 16 }}>
      <div className="card"><div className="between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Transaksi Terbaru</h2><Link href="/transaksi" className="btn ghost sm">Lihat semua</Link></div>
        {!props.transactions.length ? <p className="muted">Belum ada transaksi.</p> : <div className="dg">{props.transactions.slice(0, 6).map((tx) => <TxRow key={tx.id} t={tx} maps={maps} />)}</div>}
      </div>
      <div className="card"><div className="between" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>Saldo per Wallet</h2><small className="muted mono">{rupiah(props.totalBalance)}</small></div>
        {!props.wallets.length ? <p className="muted">Belum ada dompet.</p> : props.wallets.map((wallet) => <div key={wallet.wallet_id} className="wrow"><span>{wallet.name}</span><b className="mono">{rupiah(Number(wallet.balance))}</b></div>)}
      </div>
    </section>
  </main>;
}
