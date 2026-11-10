import { PERIODS } from "@/lib/period";
export function PeriodForm({ current, from, to, extra }: { current: string; from: string; to: string; extra?: React.ReactNode }) {
  return <form method="get" className="toolbar">{extra}
    <select name="period" defaultValue={current} aria-label="Periode">{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <input type="date" name="from" defaultValue={from} aria-label="Dari" /><input type="date" name="to" defaultValue={to} aria-label="Sampai" /><button className="ghost">Terapkan</button></form>;
}
