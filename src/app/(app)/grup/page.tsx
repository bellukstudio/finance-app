import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx, latestGroupId, setLedgerCookie, back } from "@/lib/context";
import { pgMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { SubmitButton } from "@/components/submit-button";
import { DataTable, type DTRow } from "@/components/data-table";
import { switchLedger } from "../ledger-actions";

const ROLE: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Anggota", viewer: "Viewer" };

async function create(fd: FormData) {
  "use server";
  const { sb } = await getCtx();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return back("/grup", "Nama grup harus 2–60 karakter.");
  if (!(await rateLimit(sb, "create_group", 5, 3600))) return back("/grup", "Terlalu banyak membuat grup, coba lagi nanti.");
  const { error } = await sb.rpc("create_family_with_defaults", { fname: name });
  if (error) return back("/grup", pgMessage(error));
  const gid = await latestGroupId();  // query ulang: grup baru langsung terbuka
  if (gid) await setLedgerCookie(gid);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { ledgers } = await getCtx();
  const groups = ledgers.filter((l) => l.kind === "family");
  const rows: DTRow[] = groups.map((g) => ({
    id: g.key, search: `${g.label} ${ROLE[g.role ?? ""] ?? ""}`, sort: { name: g.label, role: ROLE[g.role ?? ""] ?? "" },
    cells: { name: <span className="strong">{g.label}</span>, role: <span className="pill">{ROLE[g.role ?? ""] ?? "-"}</span>,
      act: g.active ? <span className="pill income">Sedang dibuka</span>
        : <form action={switchLedger}><input type="hidden" name="to" value={g.key} /><button className="ghost sm">Buka</button></form> },
  }));
  return (<main>
    <div className="ph"><div><h1>Grup Keluarga</h1><small className="muted">Anda bisa mengikuti banyak grup dan membuat grup sendiri. Data tiap grup terpisah.</small></div></div>
    {e && <p role="status" className="banner info">{e}</p>}
    <form action={create} className="card stack xfer"><label className="fld"><span>Nama grup baru</span><input name="name" placeholder="Contoh: Keluarga Besar, Rumah Kontrakan" minLength={2} maxLength={60} required /></label>
      <p className="xfer-sub">Anda otomatis menjadi Owner grup ini dan bisa mengundang anggota dari menu Anggota.</p>
      <SubmitButton className="save" pending="Membuat grup…">Buat grup</SubmitButton></form>
    <h2 className="sec">Grup yang Anda ikuti</h2>
    <DataTable label="Grup yang diikuti" rows={rows} empty="Belum ikut grup mana pun."
      columns={[{ key: "name", header: "Nama grup", sortable: true }, { key: "role", header: "Peran Anda", sortable: true }, { key: "act", header: "Aksi" }]} />
  </main>);
}
