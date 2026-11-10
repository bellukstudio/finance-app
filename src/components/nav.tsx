"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { ConfirmDialog } from "./confirm-dialog";
import type { LedgerOpt } from "@/lib/context";
import { TxModal, type BudgetOpt, type CatOpt, type Opt } from "./tx-modal";

type Ledger = "family" | "personal";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Anggota", viewer: "Viewer" };

/** Pengalih catatan: catatan pribadi sendiri + semua grup keluarga yang diikuti. Server menolak grup yang bukan keanggotaan user. */
function LedgerPicker({ ledgers, action }: { ledgers: LedgerOpt[]; action: (fd: FormData) => Promise<void> }) {
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
      <button type="button" className="lp-cur" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon n={cur.kind === "personal" ? "lock" : "home"} /><span className="lp-t"><b>{cur.label}</b><small>{sub(cur)}</small></span><Icon n="chev" className="ico lp-chev" />
      </button>
      <div className="lp-list" hidden={!open}>
        {me && item(me)}
        <div className="grp">Grup keluarga ({groups.length})</div>
        {groups.map(item)}
        <Link href="/grup" className="lp-new"><Icon n="plus" /> Buat atau kelola grup</Link>
      </div>
    </div>
  );
}

const GROUPS: [string, [string, string][]][] = [
  ["Utama", [["/dashboard", "Dashboard"], ["/transaksi", "Transaksi"], ["/transfer", "Transfer"]]],
  ["Kelola", [["/dompet", "Dompet"], ["/kategori", "Kategori"], ["/budget", "Budget"], ["/laporan", "Laporan"]]],
  ["Kekayaan", [["/aset", "Aset"], ["/utang", "Utang & Piutang"], ["/berulang", "Berulang"]]],
  ["Keluarga", [["/grup", "Grup"], ["/anggota", "Anggota"], ["/notifikasi", "Notifikasi"], ["/audit", "Audit"], ["/pengaturan", "Pengaturan"]]],
];
/** Catatan pribadi tidak punya anggota/undangan, jadi menu "Anggota" disembunyikan. */
const groupsFor = (ledger: Ledger): typeof GROUPS => ledger === "personal"
  ? GROUPS.map(([g, items]) => (g === "Keluarga" ? ["Pribadi", items.filter(([h]) => h !== "/anggota")] : [g, items]) as [string, [string, string][]])
  : GROUPS;

function ThemeButton() {
  return (
    <button type="button" className="ghost" aria-label="Ganti tema" onClick={() => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch {}
    }}><Icon n="moon" /></button>
  );
}

type Props = { unread: number; signOut: () => Promise<void>; wallets: Opt[]; cats: CatOpt[]; budgets: BudgetOpt[]; ledger: Ledger; ledgers: LedgerOpt[]; switchLedger: (fd: FormData) => Promise<void>; children: React.ReactNode };
export function AppNav({ unread, signOut, wallets, cats, budgets, ledger, ledgers, switchLedger, children }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false), [tx, setTx] = useState(false);
  const [ask, setAsk] = useState<{ title: string; message?: string; label?: string; tone: "danger" | "default"; btn: HTMLButtonElement } | null>(null);
  // Tombol submit dengan data-confirm="pesan" memunculkan dialog konfirmasi sebelum form dikirim.
  // Opsional: data-confirm-title, data-confirm-label, data-confirm-tone="default".
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
  // Tombol mana pun di halaman dengan atribut data-open-tx membuka modal catat transaksi.
  useEffect(() => { const h = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("[data-open-tx]")) { setMenu(false); setTx(true); } }; document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, []);
  const personal = ledger === "personal", brand = personal ? "Catatan Pribadi" : "Family Finance";
  const links = (onClick?: () => void) => groupsFor(ledger).map(([g, items]) => (
    <div key={g}><div className="grp">{g}</div>
      {items.map(([h, l]) => (
        <Link key={h} href={h} aria-current={cur(h)} onClick={onClick}>{l}{h === "/notifikasi" && unread > 0 && <span className="badge">{unread}</span>}</Link>
      ))}
    </div>
  ));
  const canTx = wallets.length > 0;
  return (
    <div className="shell" data-ledger={ledger}>
      <aside className="side">
        <Link href="/dashboard" className="brand">{brand}</Link>
        <LedgerPicker ledgers={ledgers} action={switchLedger} />
        {canTx && <button type="button" className="newtx" data-open-tx><Icon n="plus" /> Transaksi</button>}
        <nav className="nav">{links()}</nav>
        <div className="side-foot"><ThemeButton /><form action={signOut}><button className="ghost" data-confirm="Anda perlu masuk lagi untuk membuka data keuangan." data-confirm-title="Keluar dari akun?" data-confirm-label="Keluar" data-confirm-tone="default">Keluar</button></form></div>
      </aside>
      <div>
        <header className="topbar"><Link href="/dashboard" className="brand" style={{ padding: 0 }}>{brand}</Link>{personal && <span className="ledger-tag"><Icon n="lock" />Pribadi</span>}<ThemeButton /></header>
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
            <form action={signOut} style={{ marginTop: 16 }}><button className="ghost" style={{ width: "100%" }} data-confirm="Anda perlu masuk lagi untuk membuka data keuangan." data-confirm-title="Keluar dari akun?" data-confirm-label="Keluar" data-confirm-tone="default">Keluar</button></form>
          </div>
        </div>
      )}
      {ask && <ConfirmDialog title={ask.title} message={ask.message} confirmLabel={ask.label ?? "Ya, lanjutkan"} tone={ask.tone} onCancel={() => setAsk(null)}
        onConfirm={() => { const b = ask.btn; setAsk(null); b.form?.requestSubmit(b); }} />}
      {tx && <TxModal wallets={wallets} cats={cats} budgets={budgets} onClose={() => setTx(false)} />}
    </div>
  );
}
