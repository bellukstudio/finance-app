"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const P = {
  home: "M3 12l9-9 9 9M5 10v10h14V10", list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14", chart: "M18 20V10M12 20V4M6 20v-6", menu: "M4 6h16M4 12h16M4 18h16",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z", sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
};
const Icon = ({ n }: { n: keyof typeof P }) => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={P[n]} /></svg>;

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

export function AppNav({ unread, signOut, children }: { unread: number; signOut: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const cur = (h: string) => (path === h || path.startsWith(h + "/") ? "page" : undefined);
  const links = (onClick?: () => void) => GROUPS.map(([g, items]) => (
    <div key={g}><div className="grp">{g}</div>
      {items.map(([h, l]) => (
        <Link key={h} href={h} aria-current={cur(h)} onClick={onClick}>{l}{h === "/notifikasi" && unread > 0 && <span className="badge">{unread}</span>}</Link>
      ))}
    </div>
  ));
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/dashboard" className="brand">Family Finance</Link>
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
        <Link href="/transaksi#tambah" className="fab" aria-label="Tambah transaksi"><Icon n="plus" /></Link>
        <Link href="/laporan" aria-current={cur("/laporan")}><Icon n="chart" />Laporan</Link>
        <button type="button" onClick={() => setOpen(true)}><Icon n="menu" />Menu</button>
      </nav>
      {open && (
        <div className="sheet" onClick={() => setOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <nav className="nav">{links(() => setOpen(false))}</nav>
            <form action={signOut} style={{ marginTop: 16 }}><button className="ghost" style={{ width: "100%" }}>Keluar</button></form>
          </div>
        </div>
      )}
    </div>
  );
}
