"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryPie, IncomeExpenseChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { TxRow, type TxRowData } from "@/components/tx-row";
import { rupiah } from "@/lib/format";

type Row = Record<string, string | number>;
type Tx = TxRowData & { budget_id: string | null };

type DashboardContentProps = {
  ledger: "family" | "personal";
  from: string;
  to: string;
  monthLabel: string;
  year: number;
  income: number;
  expense: number;
  net: number;
  trfSum: number;
  trfCount: number;
  recent: Tx[];
  wallets: { wallet_id: string; name: string; balance: number }[];
  cats: { id: string; name: string }[];
  bs: { id: string; name: string | null; amount: number }[];
  series: Row[];
  catTot: Row[];
  x: Record<string, number>;
  debts: { id: string; direction: string; principal: number }[];
  pays: { debt_id: string; amount: number }[];
  alerts: { name: string; total: number; used: number; pct: number }[];
  qs: string;
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (y: number, m: number, d: number) => { const x = new Date(Date.UTC(y, m - 1 + d, 1)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`; };

export function DashboardContent({ ledger, from, to, monthLabel, year, income, expense, net, trfSum, trfCount, recent, wallets, cats, bs, series, catTot, x, debts, pays, alerts, qs }: DashboardContentProps) {
  const [sheet, setSheet] = useState<null | { title: string; subtitle?: string; items: Tx[] }>(null);
  const walletMap = useMemo(() => new Map((wallets ?? []).map((w) => [w.wallet_id as string, w.name as string])), [wallets]);
  const catMap = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c.name])), [cats]);
  const budgetMap = useMemo(() => new Map((bs ?? []).map((b) => [b.id, b.name || "Budget"])), [bs]);

  const txByType = (type: string) => (recent ?? []).filter((t) => t.type === type);
  const txByMonthDay = (label: string, type: string) => {
    const day = Number(label.replace(/\D/g, ""));
    return (recent ?? []).filter((t) => t.type === type && t.date?.slice(0, 7) === from.slice(0, 7) && Number(t.date.slice(8, 10)) === day);
  };
  const txByCategory = (name: string) => (recent ?? []).filter((t) => t.type === "expense" && catMap.get(t.category_id ?? "") === name);
  const txByBudget = (budgetId: string) => (recent ?? []).filter((t) => t.budget_id === budgetId);

  const openDetail = (title: string, items: Tx[], subtitle?: string) => setSheet({ title, subtitle, items });
  const tile = (l: string, v: number, c: string, ic: Parameters<typeof Icon>[0]["n"], sub: string, onClick?: () => void) => {
    const body = <><span className="ic"><Icon n={ic} /></span><small className="muted">{l}</small><b>{rupiah(v)}</b><small className="muted">{sub}</small></>;
    return <button type="button" key={l} className="sc" style={{ ["--c" as string]: c }} onClick={onClick}>{body}</button>;
  };

  return (
    <main>
      <div className="ph">
        <div className="l">
          <h1>{ledger === "personal" ? "Dashboard Pribadi" : "Dashboard"}</h1>
          <div className="mnav" role="group" aria-label="Pilih bulan">
            <Link href={`?m=${shift(year, Number(monthLabel.split("-")[1]) || 1, -1)}`} aria-label="Bulan sebelumnya"><Icon n="left" /></Link>
            <span>{monthLabel}</span>
            <Link href={`?m=${shift(year, Number(monthLabel.split("-")[1]) || 1, 1)}`} aria-label="Bulan berikutnya"><Icon n="right" /></Link>
          </div>
        </div>
      </div>

      <div className="banners">
        {alerts.map((a) => a.pct >= 100
          ? <div key={a.name} className="banner red"><Icon n="alert" /><b>{a.name}</b> Budget habis! {rupiah(a.used)} / {rupiah(a.total)}</div>
          : <div key={a.name} className="banner amber"><Icon n="bell" /><b>{a.name}</b> {Math.round(a.pct)}% terpakai. Sisa {rupiah(a.total - a.used)}</div>)}
        <div className="banner info"><Icon n="hand" /><span>Utang: <b className="mono">{rupiah((debts ?? []).filter((d) => d.direction === "payable").reduce((a, d) => a + Math.max(0, Number(d.principal) - (pays ?? []).filter((p) => p.debt_id === d.id).reduce((sum, p) => sum + Number(p.amount), 0)), 0))}</b></span><span>Piutang: <b className="mono">{rupiah((debts ?? []).filter((d) => d.direction === "receivable").reduce((a, d) => a + Math.max(0, Number(d.principal) - (pays ?? []).filter((p) => p.debt_id === d.id).reduce((sum, p) => sum + Number(p.amount), 0)), 0))}</b></span></div>
      </div>

      <section className="grid g4">
        {tile("Pemasukan", income, "var(--income)", "down", "Klik untuk detail", () => openDetail("Detail Pemasukan", txByType("income"), "Semua pemasukan"))}
        {tile("Pengeluaran", expense, "var(--expense)", "up", income ? `${Math.round((expense / income) * 100)}% dari pemasukan` : "Belum ada pemasukan", () => openDetail("Detail Pengeluaran", txByType("expense"), "Semua pengeluaran"))}
        {tile("Selisih", net, net >= 0 ? "var(--warn)" : "var(--expense)", "scale", income ? `Saving rate ${Math.round((net / income) * 100)}%` : "Saving rate -", () => openDetail("Detail Selisih", [...txByType("income"), ...txByType("expense")]))}
        {tile("Transfer", trfSum, "var(--transfer)", "swap", `${trfCount} transaksi`, () => openDetail("Detail Transfer", txByType("transfer"), `${trfCount} transaksi`))}
      </section>

      <section className="grid g2e">
        <div className="card">
          <h2>Per Kategori</h2>
          <CategoryPie data={((catTot ?? []) as Row[]).map((r) => ({ name: String(r.name), value: Number(r.total) }))} onCategoryClick={(d) => openDetail(`Kategori: ${d.name}`, txByCategory(d.name), `Total: ${rupiah(d.value)}`)} />
        </div>
        <div className="card">
          <h2>Tren Harian</h2>
          <IncomeExpenseChart data={((series ?? []) as Row[]).map((r) => ({ label: String(r.bucket).slice(8), income: Number(r.income), expense: Number(r.expense), incomeHref: "#", expenseHref: "#" }))} onBarClick={(kind, label) => openDetail(`Detail ${kind === "income" ? "Pemasukan" : "Pengeluaran"} ${label}`, txByMonthDay(String(label), kind), `Hari ${label}`)} />
        </div>
      </section>

      <section className="grid g2e">
        <div className="card">
          <div className="between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Transaksi Terbaru</h2><Link href="/transaksi" className="btn ghost sm" style={{ padding: ".25rem .7rem" }}>Lihat semua</Link></div>
          {!recent?.length ? <p className="muted">Belum ada transaksi.</p> : <div className="dg">{recent.map((t) => <TxRow key={t.id} t={t} maps={{ wallets: walletMap, cats: catMap, budgets: budgetMap }}>{!t.budget_id ? null : <button type="button" className="mini-link" onClick={() => openDetail(`Budget: ${budgetMap.get(t.budget_id ?? "") ?? "Budget"}`, txByBudget(t.budget_id ?? ""), "Transaksi dalam budget ini")}>Lihat budget</button>}</TxRow>)}</div>}
        </div>
        <div className="card">
          <div className="between" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>Saldo per Wallet</h2><small className="muted mono">{rupiah(x.total_balance ?? 0)}</small></div>
          {!wallets?.length ? <p className="muted">Belum ada dompet.</p> : wallets.map((w) => { const v = Number(w.balance); return <div key={w.wallet_id} className="wrow"><span>{w.name}</span><span className="mono">{rupiah(v)}</span></div>; })}
        </div>
      </section>

      {sheet && (
        <div className="sheet-overlay" onClick={() => setSheet(null)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="between" style={{ marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>{sheet.title}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setSheet(null)}><Icon n="x" /></button>
            </div>
            {sheet.subtitle && <p className="muted" style={{ marginBottom: 10 }}>{sheet.subtitle}</p>}
            {!sheet.items.length ? <p className="muted">Tidak ada transaksi.</p> : <div className="dg">{sheet.items.map((t) => <TxRow key={t.id} t={t} maps={{ wallets: walletMap, cats: catMap, budgets: budgetMap }} />)}</div>}
          </div>
        </div>
      )}
    </main>
  );
}
