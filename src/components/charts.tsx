"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CategoryDatum = { name: string; value: number; href?: string };
type TrendDatum = { label: string; income: number; expense: number; incomeHref?: string; expenseHref?: string };
const COLORS = ["#22e1ee", "#a78bfa", "#2ef2a2", "#ffbf3c", "#ff4f81", "#5aa7ff", "#f472b6", "#94a3b8"];
const idr = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);
const compact = (v: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v);
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" }, cursor: { fill: "var(--surface-2)" } };
const axis = { tick: { fill: "var(--muted)", fontSize: 12 }, tickLine: false, axisLine: false } as const;
const Empty = ({ t }: { t: string }) => <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>{t}</p>;
const go = (href?: string) => { if (href && typeof window !== "undefined") window.location.assign(href); };

export function IncomeExpenseChart({ data, onBarClick }: { data: TrendDatum[]; onBarClick?: (kind: "income" | "expense", label: string) => void }) {
  if (!data.length) return <Empty t="Belum ada data pada periode ini." />;
  return (
    <div style={{ height: 250 }}><ResponsiveContainer><BarChart data={data} barGap={3}>
      <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={compact} width={48} {...axis} />
      <Tooltip {...tip} formatter={(v: number) => idr(v)} />
      <Bar dataKey="income" name="Pemasukan" fill="var(--income)" fillOpacity={0.85} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry: any) => onBarClick?.("income", String(entry?.payload?.label ?? ""))} />
      <Bar dataKey="expense" name="Pengeluaran" fill="var(--expense)" fillOpacity={0.85} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry: any) => onBarClick?.("expense", String(entry?.payload?.label ?? ""))} />
      <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
    </BarChart></ResponsiveContainer></div>
  );
}

export function CategoryPie({ data, onCategoryClick }: { data: CategoryDatum[]; onCategoryClick?: (item: CategoryDatum) => void }) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length) return <Empty t="Belum ada pengeluaran pada periode ini." />;
  const total = data.reduce((a, d) => a + d.value, 0);
  const sel = active === null ? null : data[active];
  return (
    <div className="pie">
      <div style={{ height: 190, width: 190, position: "relative", flex: "none" }}>
        <ResponsiveContainer><PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="96%" paddingAngle={2} stroke="none"
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} onClick={(_, i) => { const item = data[i]; if (!item) return; if (onCategoryClick) onCategoryClick(item); else go(item.href); }}
            >
            {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} opacity={active === null || active === i ? 1 : 0.35} cursor={d.href || onCategoryClick ? "pointer" : undefined} />)}
          </Pie>
        </PieChart></ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center", padding: 34 }}>
          <div><small>{sel ? sel.name : "Total"}</small><div className="mono" style={{ fontSize: ".82rem", fontWeight: 700 }}>{idr(sel ? sel.value : total)}</div></div>
        </div>
      </div>
      <ul className="legend">
        {data.slice(0, 8).map((d, i) => (
          <li key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => { if (onCategoryClick) onCategoryClick(d); else go(d.href); }} style={{ cursor: onCategoryClick || d.href ? "pointer" : undefined }}>
            <span><i style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
            <span className="muted mono">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WalletBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty t="Belum ada dompet." />;
  return (
    <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 8 }}>
      <CartesianGrid horizontal={false} stroke="var(--line)" /><XAxis type="number" tickFormatter={compact} {...axis} /><YAxis type="category" dataKey="name" width={90} {...axis} />
      <Tooltip {...tip} formatter={(v: number) => idr(v)} />
      <Bar dataKey="value" name="Saldo" fill="var(--primary)" radius={[0, 6, 6, 0]} />
    </BarChart></ResponsiveContainer></div>
  );
}
