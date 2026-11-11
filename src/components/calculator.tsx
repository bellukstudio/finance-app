"use client";

import { useEffect, useState } from "react";

type Operator = "+" | "−" | "×" | "÷";
type Entry = { expression: string; result: string; createdAt: number };
const HISTORY_KEY = "finance-calculator-history-v1";
const format = (n: number) => Number.isFinite(n) ? String(Number(n.toPrecision(12))) : "Error";

function calculate(a: number, b: number, op: Operator): number {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  return b === 0 ? Number.NaN : a / b;
}

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [replaceDisplay, setReplaceDisplay] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved) as Entry[]);
    } catch { /* local storage may be disabled */ }
  }, []);

  const addDigit = (digit: string) => {
    setDisplay(current => replaceDisplay || current === "0" || current === "Error" ? digit : current.length < 16 ? current + digit : current);
    setReplaceDisplay(false);
  };
  const decimal = () => {
    if (replaceDisplay || display === "Error") { setDisplay("0."); setReplaceDisplay(false); }
    else if (!display.includes(".")) setDisplay(display + ".");
  };
  const backspace = () => {
    if (replaceDisplay || display === "Error") { setDisplay("0"); setReplaceDisplay(false); return; }
    setDisplay(current => current.length <= 1 || (current.length === 2 && current.startsWith("-")) ? "0" : current.slice(0, -1));
  };
  const chooseOperator = (next: Operator) => {
    const current = Number(display);
    if (operator && stored !== null && !replaceDisplay) {
      const result = calculate(stored, current, operator);
      setDisplay(format(result));
      setStored(result);
    } else {
      setStored(current);
    }
    setOperator(next);
    setReplaceDisplay(true);
  };
  const equals = () => {
    if (!operator || stored === null || display === "Error") return;
    const right = Number(display);
    const result = calculate(stored, right, operator);
    const expression = `${format(stored)} ${operator} ${format(right)}`;
    const shown = format(result);
    setDisplay(shown);
    setStored(null);
    setOperator(null);
    setReplaceDisplay(true);
    const entry = { expression, result: shown, createdAt: Date.now() };
    setHistory(current => {
      const updated = [entry, ...current].slice(0, 100);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* keep the in-memory history */ }
      return updated;
    });
  };
  const clear = () => { setDisplay("0"); setStored(null); setOperator(null); setReplaceDisplay(false); };

  const keys: { label: string; action: () => void; className?: string; aria?: string }[] = [
    { label: "C", action: clear, className: "secondary" }, { label: "⌫", action: backspace, className: "secondary", aria: "Hapus angka terakhir" },
    { label: "÷", action: () => chooseOperator("÷"), className: "operator" }, { label: "×", action: () => chooseOperator("×"), className: "operator" },
    { label: "7", action: () => addDigit("7") }, { label: "8", action: () => addDigit("8") }, { label: "9", action: () => addDigit("9") }, { label: "−", action: () => chooseOperator("−"), className: "operator" },
    { label: "4", action: () => addDigit("4") }, { label: "5", action: () => addDigit("5") }, { label: "6", action: () => addDigit("6") }, { label: "+", action: () => chooseOperator("+"), className: "operator" },
    { label: "1", action: () => addDigit("1") }, { label: "2", action: () => addDigit("2") }, { label: "3", action: () => addDigit("3") }, { label: "=", action: equals, className: "equals" },
    { label: "±", action: () => setDisplay(current => current === "0" || current === "Error" ? current : current.startsWith("-") ? current.slice(1) : `-${current}`), className: "secondary" },
    { label: "0", action: () => addDigit("0"), className: "zero" }, { label: ".", action: decimal, className: "secondary" },
  ];

  return <main className="calc-page">
    <header><h1>Kalkulator</h1><p className="muted">Tekan operator untuk langsung menghitung, lalu = untuk menyimpan hasil ke riwayat.</p></header>
    <div className="calc-layout">
      <section className="calculator card" aria-label="Kalkulator">
        <div className="screen" aria-live="polite"><small>{stored !== null && operator ? `${format(stored)} ${operator}` : ""}</small><output>{display}</output></div>
        <div className="keys">{keys.map(key => <button key={key.label} type="button" className={key.className ?? ""} onClick={key.action} aria-label={key.aria ?? key.label}>{key.label}</button>)}</div>
      </section>
      <section className="history card" aria-label="Riwayat kalkulasi">
        <div className="history-head"><h2>Riwayat kalkulasi</h2><span>{history.length}</span></div>
        {!history.length ? <p className="muted">Belum ada hasil. Riwayat ditambahkan saat tombol = ditekan dan tersimpan di perangkat ini.</p> : <ol>{history.map((item, index) => <li key={`${item.createdAt}-${index}`}><span>{item.expression}</span><b>= {item.result}</b></li>)}</ol>}
      </section>
    </div>
    <style jsx>{`
      .calc-page{max-width:980px;margin:0 auto}.calc-layout{display:grid;grid-template-columns:minmax(280px,420px) minmax(260px,1fr);gap:18px;align-items:start}.calculator,.history{padding:18px}.screen{background:var(--surface-2);border-radius:14px;padding:12px 16px;margin-bottom:12px;text-align:right;min-height:88px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.screen small{height:20px;color:var(--muted)}.screen output{font:500 clamp(1.7rem,7vw,2.4rem)/1.2 var(--font-mono,monospace);overflow-x:auto;white-space:nowrap}.keys{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.keys button{min-height:56px;justify-content:center;font-size:1.15rem}.keys .secondary{background:var(--surface-2);color:var(--text)}.keys .operator{background:color-mix(in srgb,var(--primary) 16%,var(--surface));color:var(--primary)}.keys .equals{grid-column:4;grid-row:4 / span 2;background:var(--primary);color:var(--primary-ink)}.keys .zero{grid-column:2}.history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.history-head h2{margin:0}.history-head span{color:var(--muted);font-size:.85rem}.history ol{list-style:none;padding:0;margin:0;display:grid;gap:8px;max-height:420px;overflow:auto}.history li{display:grid;gap:3px;padding:10px 12px;border-radius:10px;background:var(--surface-2);font-variant-numeric:tabular-nums}.history li span{color:var(--muted);font-size:.85rem}.history li b{text-align:right;font-family:var(--font-mono,monospace)}@media(max-width:720px){.calc-layout{grid-template-columns:minmax(0,1fr)}.calculator{max-width:440px;width:100%;margin:auto}.history{width:100%}.keys button{min-height:52px}}
    `}</style>
  </main>;
}
