import { PERIODS } from "@/lib/period";
export function PeriodForm({ current, from, to, extra }: { current: string; from: string; to: string; extra?: React.ReactNode }) {
  return <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>{extra}
    <select name="period" defaultValue={current}>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <input type="date" name="from" defaultValue={from} /><input type="date" name="to" defaultValue={to} /><button>Terapkan</button></form>;
}
