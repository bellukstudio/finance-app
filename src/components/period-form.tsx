import Form from "next/form";
import { PERIODS } from "@/lib/period";
export function PeriodForm({ action, current, from, to, extra }: { action: string; current: string; from: string; to: string; extra?: React.ReactNode }) {
  return <Form action={action} className="toolbar">{extra}
    <select name="period" defaultValue={current} aria-label="Periode">{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <input type="date" name="from" defaultValue={from} aria-label="Dari" /><input type="date" name="to" defaultValue={to} aria-label="Sampai" /><button className="ghost">Terapkan</button></Form>;
}
