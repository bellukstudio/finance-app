"use client";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
const COLORS = ["#2563eb","#16a34a","#f59e0b","#dc2626","#9333ea","#0891b2","#db2777","#65a30d","#ea580c","#4b5563"];
const fmt = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);
export function IncomeExpenseChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  if (!data.length) return <p>Belum ada data pada periode ini.</p>;
  return <div style={{ height: 260 }}><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v)} />
    <Tooltip formatter={(v: number) => fmt(v)} /><Legend /><Bar dataKey="income" name="Pemasukan" fill="#16a34a" /><Bar dataKey="expense" name="Pengeluaran" fill="#dc2626" /></BarChart></ResponsiveContainer></div>;
}
export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p>Belum ada data pada periode ini.</p>;
  return <div style={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
    <Tooltip formatter={(v: number) => fmt(v)} /><Legend /></PieChart></ResponsiveContainer></div>;
}
export function WalletBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p>Belum ada dompet.</p>;
  return <div style={{ height: 260 }}><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v)} />
    <Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" name="Saldo" fill="#2563eb" /></BarChart></ResponsiveContainer></div>;
}
