"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { TxModal, type BudgetOpt, type CatOpt, type Opt } from "./tx-modal";

const GROUPS: [string, [string, string][]][] = [
  ["Utama", [["/dashboard", "Dashboard"], ["/transaksi", "Transaksi"], ["/transfer", "Transfer"]]],
  ["Kelola", [["/dompet", "Dompet"], ["/kategori", "Kategori"], ["/budget", "Budget"], ["/laporan", "Laporan"]]],
  ["Kekayaan", [["/aset", "Aset"], ["/utang", "Utang & Piutang"], ["/berulang", "Berulang"]]],
  ["Keluarga", [["/anggota", "Anggota"], ["/notifikasi", "Notifikasi"], ["/audit", "Audit"], ["/pengaturan", "Pengaturan"]]],
];

function ThemeButton() {
  return (
    <button type="button" className="ghost" aria-label="Ganti tema" onClick={() => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch {}
    }}><Icon n="moon" /></button>
  );
}

type Props = { unread: number; signOut: () => Promise<void>; wallets: Opt[]; cats: CatOpt[]; budgets: BudgetOpt[]; children: React.ReactNode };
export function AppNav({ unread, signOut, wallets, cats, budgets, children }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false), [tx, setTx] = useState(false);
  const cur = (h: string) => (path === h || path.startsWith(h + "/") ? "page" : undefined);
  // Tombol mana pun di halaman dengan atribut data-open-tx membuka modal catat transaksi.
  useEffect(() => { const h = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("[data-open-tx]")) { setMenu(false); setTx(true); } }; document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, []);
  const links = (onClick?: () => void) => GROUPS.map(([g, items]) => (
    <div key={g}><div className="grp">{g}</div>
      {items.map(([h, l]) => (
        <Link key={h} href={h} aria-current={cur(h)} onClick={onClick}>{l}{h === "/notifikasi" && unread > 0 && <span className="badge">{unread}</span>}</Link>
      ))}
    </div>
  ));
  const canTx = wallets.length > 0;
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/dashboard" className="brand">Family Finance</Link>
        {canTx && <button type="button" className="newtx" data-open-tx><Icon n="plus" /> Transaksi</button>}
        <nav className="nav">{links()}</nav>
        <div className="side-foot"><ThemeButton /><form action={signOut}><button className="ghost">Keluar</button></form></div>
      </aside>
      <div>
        <header className="topbar"><Link href="/dashboard" className="brand" style={{ padding: 0 }}>Family Finance</Link><ThemeButton /></header>
        <div className="content">{children}</div>
      </div>
      <nav className="tabbar" aria-label="Navigasi utama">
        <Link href="/dashboard" aria-current={cur("/dashboard")}><Icon n="home" />Beranda</Link>
        <Link href="/transaksi" aria-current={cur("/transaksi")}><Icon n="list" />Transaksi</Link>
        <button type="button" className="fab" aria-label="Catat transaksi" data-open-tx disabled={!canTx}><Icon n="plus" /></button>
        <Link href="/budget" aria-current={cur("/budget")}><Icon n="target" />Budget</Link>
        <button type="button" onClick={() => setMenu(true)}><Icon n="menu" />Menu</button>
      </nav>
      {menu && (
        <div className="sheet" onClick={() => setMenu(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <nav className="nav">{links(() => setMenu(false))}</nav>
            <form action={signOut} style={{ marginTop: 16 }}><button className="ghost" style={{ width: "100%" }}>Keluar</button></form>
          </div>
        </div>
      )}
      {tx && <TxModal wallets={wallets} cats={cats} budgets={budgets} onClose={() => setTx(false)} />}
    </div>
  );
}
