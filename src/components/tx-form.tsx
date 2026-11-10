"use client";
import { useEffect, useMemo, useState } from "react";

type Opt = { id: string; name: string };
export function TxForm({ action, idem, wallets, cats }: { action: (fd: FormData) => Promise<void>; idem: string; wallets: Opt[]; cats: (Opt & { type: string })[] }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const d = new Date(); setDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)); }, []);
  const list = useMemo(() => cats.filter((c) => c.type === type), [cats, type]);
  const shown = amount ? new Intl.NumberFormat("id-ID").format(Number(amount)) : "";
  return (
    <form id="tambah" action={action} className="card quick stack" onSubmit={() => setBusy(true)}>
      <input type="hidden" name="idem" value={idem} /><input type="hidden" name="type" value={type} /><input type="hidden" name="amount" value={amount} />
      <div className="seg" role="group" aria-label="Jenis transaksi">
        <button type="button" className="expense" aria-pressed={type === "expense"} onClick={() => setType("expense")}>Pengeluaran</button>
        <button type="button" className="income" aria-pressed={type === "income"} onClick={() => setType("income")}>Pemasukan</button>
      </div>
      <div className="muted" style={{ fontSize: ".82rem" }}>Nominal (Rp)</div>
      <input className="amount" inputMode="numeric" placeholder="0" value={shown} aria-label="Nominal" required
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 13))} />
      <div className="fields">
        <label>Kategori<select name="category_id" required key={type}>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Dompet<select name="wallet_id" required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Tanggal<input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Deskripsi<input name="description" maxLength={200} placeholder="Opsional" /></label>
      </div>
      <button style={{ width: "100%", padding: ".75rem" }} disabled={busy || !amount}>{busy ? "Menyimpan…" : type === "expense" ? "Simpan pengeluaran" : "Simpan pemasukan"}</button>
    </form>
  );
}
