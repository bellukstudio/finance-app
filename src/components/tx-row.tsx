import { rupiah } from "@/lib/format";
import { Icon } from "./icons";

export type TxRowData = { id: string; type: string; amount: number | string; date: string; description: string | null; note?: string | null; wallet_id: string; to_wallet_id: string | null; category_id: string | null; budget_id?: string | null };
export type Maps = { wallets: Map<string, string>; cats: Map<string, string>; budgets: Map<string, string> };
const META = { income: { c: "var(--income)", i: "down", s: "+" }, expense: { c: "var(--expense)", i: "up", s: "−" }, transfer: { c: "var(--transfer)", i: "swap", s: "" } } as const;

export function TxRow({ t, maps, children }: { t: TxRowData; maps: Maps; children?: React.ReactNode }) {
  const m = META[t.type as keyof typeof META] ?? META.expense;
  const cat = t.category_id ? maps.cats.get(t.category_id) : null;
  const title = t.description || t.note || cat || "Transfer";
  const route = t.type === "transfer" ? `${maps.wallets.get(t.wallet_id) ?? "?"} → ${maps.wallets.get(t.to_wallet_id ?? "") ?? "?"}` : maps.wallets.get(t.wallet_id) ?? "";
  const bud = t.budget_id ? maps.budgets.get(t.budget_id) : null;
  const inner = (
    <div className="ti-main">
      <span className="ti-ico" aria-hidden="true"><Icon n={m.i} /></span>
      <span className="ti-t"><b>{title}</b><small>{[route, t.type !== "transfer" ? cat : null, t.date].filter(Boolean).join(" · ")}</small></span>
      {bud && <span className={`tag ${t.type === "expense" ? "bud" : ""}`} title={t.type === "transfer" ? "Menambah budget" : "Memotong budget"}>{t.type === "transfer" ? "+ " : ""}{bud}</span>}
      <b className="ti-amt">{m.s}{rupiah(Number(t.amount))}</b>
    </div>);
  return <div className="ti" style={{ ["--c" as string]: m.c }}>{children ? <details><summary>{inner}</summary>{children}</details> : inner}</div>;
}
