"use client";

import { useEffect, useMemo, useState } from "react";
import { TxRow, type TxRowData } from "@/components/tx-row";
import { Icon } from "@/components/icons";

type Budget = { id: string; name: string };
type Transaction = TxRowData & { budget_id: string | null };

export function BudgetTransactionsModal({ budgets, transactions, wallets, categories }: {
  budgets: Budget[];
  transactions: Transaction[];
  wallets: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<Budget | null>(null);
  const walletMap = useMemo(() => new Map(wallets.map((wallet) => [wallet.id, wallet.name])), [wallets]);
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const budgetMap = useMemo(() => new Map(budgets.map((budget) => [budget.id, budget.name])), [budgets]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>('button[aria-label="Lihat rincian"]');
      if (!button) return;
      const card = button.closest(".bcard");
      if (!card) return;
      const cards = Array.from(document.querySelectorAll(".blist .bcard"));
      const budget = budgets[cards.indexOf(card)];
      if (!budget) return;
      event.preventDefault();
      event.stopPropagation();
      setSelected(budget);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [budgets]);

  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

  if (!selected) return null;
  const linkedTransactions = transactions.filter((transaction) => transaction.budget_id === selected.id);
  const maps = { wallets: walletMap, cats: categoryMap, budgets: budgetMap };

  return (
    <div className="sheet-overlay" role="presentation" onClick={() => setSelected(null)}>
      <section className="sheet-panel" role="dialog" aria-modal="true" aria-label={`Transaksi budget ${selected.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Transaksi: {selected.name}</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setSelected(null)}><Icon n="x" /></button>
        </div>
        {!linkedTransactions.length
          ? <p className="muted">Belum ada transaksi yang terhubung dengan budget ini.</p>
          : <div className="dg">{linkedTransactions.map((transaction) => <TxRow key={transaction.id} t={transaction} maps={maps} />)}</div>}
      </section>
    </div>
  );
}
