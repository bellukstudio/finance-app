"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#64748b", "#94a3b8", "#475569", "#7c8f78", "#b08968", "#8b7fa8", "#5f8f9e", "#a1a1aa"];
const idr = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);
const compact = (v: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v);
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" }, cursor: { fill: "var(--surface-2)" } };
const axis = { tick: { fill: "var(--muted)", fontSize: 12 }, tickLine: false, axisLine: false } as const;
const Empty = ({ t }: { t: string }) => <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>{t}</p>;

export function IncomeExpenseChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  if (!data.length) return <Empty t="Belum ada data pada periode ini." />;
  return (
    <div style={{ height: 280 }}><ResponsiveContainer><BarChart data={data} barGap={4}>
      <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={compact} width={48} {...axis} />
      <Tooltip {...tip} formatter={(v: number) => idr(v)} />
      <Bar dataKey="income" name="Pemasukan" fill="var(--income)" radius={[6, 6, 0, 0]} />
      <Bar dataKey="expense" name="Pengeluaran" fill="var(--expense)" radius={[6, 6, 0, 0]} />
    </BarChart></ResponsiveContainer></div>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length) return <Empty t="Belum ada pengeluaran pada periode ini." />;
  const total = data.reduce((a, d) => a + d.value, 0);
  const sel = active === null ? null : data[active];
  return (
    <div>
      <div style={{ height: 210, position: "relative" }}>
        <ResponsiveContainer><PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none"
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={active === null || active === i ? 1 : 0.35} />)}
          </Pie>
        </PieChart></ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
          <div><small>{sel ? sel.name : "Total"}</small><div><b>{idr(sel ? sel.value : total)}</b></div></div>
        </div>
      </div>
      <ul className="list" style={{ marginTop: 8 }}>
        {data.slice(0, 6).map((d, i) => (
          <li key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], marginRight: 8 }} />{d.name}</span>
            <span className="muted">{Math.round((d.value / total) * 100)}%</span>
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
