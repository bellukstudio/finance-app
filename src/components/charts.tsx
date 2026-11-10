"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#a78bfa", "#4fd08f", "#62adff", "#f2bb4e", "#ff6f7d", "#2dd4bf", "#f472b6", "#94a3b8"];
const idr = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);
const compact = (v: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v);
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" }, cursor: { fill: "var(--surface-2)" } };
const axis = { tick: { fill: "var(--muted)", fontSize: 12 }, tickLine: false, axisLine: false } as const;
const Empty = ({ t }: { t: string }) => <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>{t}</p>;

export function IncomeExpenseChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  if (!data.length) return <Empty t="Belum ada data pada periode ini." />;
  return (
    <div style={{ height: 250 }}><ResponsiveContainer><BarChart data={data} barGap={3}>
      <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={compact} width={48} {...axis} />
      <Tooltip {...tip} formatter={(v: number) => idr(v)} />
      <Bar dataKey="income" name="Pemasukan" fill="var(--income)" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
      <Bar dataKey="expense" name="Pengeluaran" fill="var(--expense)" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
      <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
    </BarChart></ResponsiveContainer></div>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length) return <Empty t="Belum ada pengeluaran pada periode ini." />;
  const total = data.reduce((a, d) => a + d.value, 0);
  const sel = active === null ? null : data[active];
  return (
    <div className="pie">
      <div style={{ height: 190, width: 190, position: "relative", flex: "none" }}>
        <ResponsiveContainer><PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="96%" paddingAngle={2} stroke="none"
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={active === null || active === i ? 1 : 0.35} />)}
          </Pie>
        </PieChart></ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center", padding: 34 }}>
          <div><small>{sel ? sel.name : "Total"}</small><div className="mono" style={{ fontSize: ".82rem", fontWeight: 700 }}>{idr(sel ? sel.value : total)}</div></div>
        </div>
      </div>
      <ul className="legend">
        {data.slice(0, 8).map((d, i) => (
          <li key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
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
