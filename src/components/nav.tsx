"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icons";
import { ConfirmDialog } from "./confirm-dialog";
import type { LedgerOpt } from "@/lib/context";
import { TxModal, type BudgetOpt, type CatOpt, type Opt } from "./tx-modal";
import { CalculatorNavShortcut } from "./calculator-nav-shortcut";

type Ledger = "family" | "personal";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Anggota", viewer: "Viewer" };

function LedgerPicker({ ledgers, action, collapsed = false, onExpand }: { ledgers: LedgerOpt[]; action: (fd: FormData) => Promise<void>; collapsed?: boolean; onExpand?: () => void }) {
  const path = usePathname(), [open, setOpen] = useState(false);
  const cur = ledgers.find((l) => l.active) ?? ledgers[0];
  useEffect(() => setOpen(false), [path, cur?.key]);
  if (!cur) return null;
  const me = ledgers.find((l) => l.kind === "personal"), groups = ledgers.filter((l) => l.kind === "family");
  const sub = (l: LedgerOpt) => (l.kind === "personal" ? (l.role ? "Hanya Anda" : "Dibuat saat pertama dibuka") : ROLE_LABEL[l.role ?? ""] ?? "");
  const item = (l: LedgerOpt) => (
    <form action={action} key={l.key}><input type="hidden" name="to" value={l.key} />
      <button type="submit" className="lp-item" aria-current={l.active ? "true" : undefined} disabled={l.active}>
        <Icon n={l.kind === "personal" ? "lock" : "home"} /><span className="lp-t"><b>{l.label}</b><small>{sub(l)}</small></span>
      </button></form>
  );
  return (
    <div className="lp">
      <button type="button" className="lp-cur" aria-expanded={open} onClick={() => { if (collapsed) { onExpand?.(); setOpen(true); } else setOpen(!open); }} title={collapsed ? cur.label : undefined}>
        <Icon n={cur.kind === "personal" ? "lock" : "home"} /><span className="lp-t"><b>{cur.label}</b><small>{sub(cur)}</small></span><Icon n="chev" className="ico lp-chev" />
      </button>
      <div className="lp-list" hidden={!open || collapsed}>
        {me && item(me)}
        <div className="grp">Grup keluarga ({groups.length})</div>
        {groups.map(item)}
        <Link href="/grup" className="lp-new"><Icon n="plus" /> Buat atau kelola grup</Link>
      </div>
    </div>
  );
}

type NavItem = [href: string, label: string, icon: IconName];
const GROUPS: [string, NavItem[]][] = [
  ["Utama", [["/dashboard", "Dashboard", "home"], ["/transaksi", "Transaksi", "list"], ["/transfer", "Transfer", "swap"]]],
  ["Kelola", [["/dompet", "Dompet", "wallet"], ["/kategori", "Kategori", "tag"], ["/budget", "Budget", "target"], ["/laporan", "Laporan", "chart"]]],
  ["Kekayaan", [["/aset", "Aset", "scale"], ["/utang", "Utang & Piutang", "coin"], ["/berulang", "Berulang", "repeat"]]],
  ["Keluarga", [["/grup", "Grup", "group"], ["/anggota", "Anggota", "users"], ["/notifikasi", "Notifikasi", "bell"], ["/audit", "Audit", "shield"], ["/pengaturan", "Pengaturan", "cog"]]],
];
const groupsFor = (ledger: Ledger): typeof GROUPS => ledger === "personal"
  ? GROUPS.map(([g, items]) => (g === "Keluarga" ? ["Pribadi", items.filter(([h]) => h !== "/anggota")] : [g, items]) as [string, NavItem[]])
  : GROUPS;

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
}
const ThemeIcons = () => <span className="ti2" aria-hidden="true"><Icon n="moon" className="ico t-moon" /><Icon n="sun" className="ico t-sun" /></span>;

type Props = { unread: number; signOut: () => Promise<void>; wallets: Opt[]; cats: CatOpt[]; budgets: BudgetOpt[]; ledger: Ledger; ledgers: LedgerOpt[]; user: { name: string; role: string }; switchLedger: (fd: FormData) => Promise<void>; children: React.ReactNode; };
export function AppNav({ unread, signOut, wallets, cats, budgets, ledger, ledgers, user, switchLedger, children }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false), [tx, setTx] = useState(false), [txAmt, setTxAmt] = useState(""), [col, setCol] = useState(false), [um, setUm] = useState(false);
  useEffect(() => { try { setCol(localStorage.getItem("sb-collapsed") === "1"); } catch {} }, []);
  const setCollapsed = (v: boolean) => { setCol(v); setUm(false); try { localStorage.setItem("sb-collapsed", v ? "1" : "0"); } catch {} };
  useEffect(() => setUm(false), [path]);
  useEffect(() => { if (!um) return; const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".uc")) setUm(false); }; const k = (e: KeyboardEvent) => e.key === "Escape" && setUm(false); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, [um]);
  const [ask, setAsk] = useState<{ title: string; message?: string; label?: string; tone: "danger" | "default"; btn: HTMLButtonElement } | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-confirm]");
      if (!btn || !btn.form || btn.disabled) return;
      e.preventDefault(); e.stopPropagation();
      const d = btn.dataset;
      setAsk({ title: d.confirmTitle ?? d.confirm ?? "Lanjutkan?", message: d.confirmTitle ? d.confirm : undefined, label: d.confirmLabel, tone: d.confirmTone === "default" ? "default" : "danger", btn });
    };
    document.addEventListener("click", h, true); return () => document.removeEventListener("click", h, true);
  }, []);
  const cur = (h: string) => (path === h || path.startsWith(h + "/") ? "page" : undefined);
  useEffect(() => { const h = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("[data-open-tx]")) { setMenu(false); setTx(true); } }; document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, []);
  useEffect(() => { const h = (e: Event) => { const a = (e as CustomEvent<{ amount?: string }>).detail?.amount; setMenu(false); setTxAmt(a ?? ""); setTx(true); }; window.addEventListener("calc:use-in-tx", h); return () => window.removeEventListener("calc:use-in-tx", h); }, []);
  const personal = ledger === "personal", brand = personal ? "Catatan Pribadi" : "Family Finance";
  const links = (onClick?: () => void) => groupsFor(ledger).map(([g, items]) => (
    <div key={g} className="ng"><div className="grp"><span>{g}</span></div>
      {items.map(([h, l, ic]) => (
        <Link key={h} href={h} aria-current={cur(h)} onClick={onClick} title={l}><Icon n={ic} /><span className="nl">{l}</span>{h === "/notifikasi" && unread > 0 && <span className="badge">{unread}</span>}</Link>
      ))}
    </div>
  ));
  const canTx = wallets.length > 0;
  return (
    <div className="shell" data-ledger={ledger} data-collapsed={col ? "true" : "false"}>
      <aside className="side">
        <div className="side-top">
          <Link href="/dashboard" className="brand" title={brand}><span className="logo" aria-hidden="true"><Icon n="layers" /></span><span className="bn">{brand}</span></Link>
          <LedgerPicker ledgers={ledgers} action={switchLedger} collapsed={col} onExpand={() => setCollapsed(false)} />
          {canTx && <button type="button" className="newtx" data-open-tx title="Catat transaksi"><Icon n="plus" /><span className="nl">Transaksi</span></button>}
          <nav className="nav" aria-label="Menu utama">{links()}</nav>
          <CalculatorNavShortcut />
        </div>
        <div className="side-foot uc">
          {um && <div className="um" role="menu">
            <button type="button" role="menuitem" onClick={toggleTheme}><ThemeIcons /><span>Ganti tema</span></button>
            <Link href="/pengaturan" role="menuitem"><Icon n="cog" /><span>Pengaturan</span></Link>
            <form action={signOut}><button role="menuitem" className="out" data-confirm="Anda perlu masuk lagi untuk membuka data keuangan." data-confirm-title="Keluar dari akun?" data-confirm-label="Keluar" data-confirm-tone="danger">Keluar</button></form>
          </div>}
          <button type="button" className="ucard" aria-haspopup="menu" aria-expanded={um} onClick={() => setUm(!um)} title={user.name}>
            <span className="av" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="ut"><b>{user.name}</b><small>{user.role}</small></span><Icon n="chev" className="ico uchev" />
          </button>
        </div>
        <button type="button" className="side-toggle" onClick={() => setCollapsed(!col)} aria-label={col ? "Perluas sidebar" : "Ciutkan sidebar"} aria-pressed={col}><Icon n={col ? "right" : "left"} /></button>
      </aside>
      <div>
        <header className="topbar"><Link href="/dashboard" className="brand" style={{ padding: 0 }}><span className="logo" aria-hidden="true"><Icon n="layers" /></span><span className="bn">{brand}</span></Link><button type="button" className="ghost ib" onClick={() => setMenu(true)} aria-label="Buka menu"><Icon n="menu" /></button></header>
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
            <LedgerPicker ledgers={ledgers} action={switchLedger} />
            <nav className="nav">{links(() => setMenu(false))}</nav>
            <CalculatorNavShortcut />
            <form action={signOut} style={{ marginTop: 16 }}><button className="ghost out-m" style={{ width: "100%" }} data-confirm="Anda perlu masuk lagi untuk membuka data keuangan." data-confirm-title="Keluar dari akun?" data-confirm-label="Keluar" data-confirm-tone="danger">Keluar</button></form>
          </div>
        </div>
      )}
      {ask && <ConfirmDialog title={ask.title} message={ask.message} confirmLabel={ask.label ?? "Ya, lanjutkan"} tone={ask.tone} onCancel={() => setAsk(null)} onConfirm={() => { const b = ask.btn; setAsk(null); b.form?.requestSubmit(b); }} />}
      {tx && <TxModal wallets={wallets} cats={cats} budgets={budgets} initialAmount={txAmt} onClose={() => { setTx(false); setTxAmt(""); }} />}
    </div>
  );
}
