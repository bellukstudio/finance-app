"use client";

import { useEffect, useState } from "react";

type Operator = "+" | "−" | "×" | "÷";
type Entry = { expression: string; result: string; createdAt: number };
const HISTORY_KEY = "finance-calculator-history-v1";
const format = (n: number) => Number.isFinite(n) ? String(Number(n.toPrecision(12))) : "Error";
const calculate = (a: number, b: number, op: Operator) => op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b === 0 ? Number.NaN : a / b;

export function CalculatorPopover({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [replace, setReplace] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved) as Entry[]);
    } catch { /* local storage can be disabled */ }
  }, []);

  const digit = (value: string) => {
    setDisplay(current => replace || current === "0" || current === "Error" ? value : current.length < 16 ? current + value : current);
    setReplace(false);
  };
  const clear = () => { setDisplay("0"); setStored(null); setOperator(null); setReplace(false); };
  const backspace = () => {
    if (replace || display === "Error") { setDisplay("0"); setReplace(false); return; }
    setDisplay(current => current.length <= 1 || (current.length === 2 && current.startsWith("-")) ? "0" : current.slice(0, -1));
  };
  const choose = (next: Operator) => {
    const value = Number(display);
    if (operator && stored !== null && !replace) {
      const result = calculate(stored, value, operator);
      setStored(result); setDisplay(format(result));
    } else setStored(value);
    setOperator(next); setReplace(true);
  };
  const equals = () => {
    if (!operator || stored === null || display === "Error") return;
    const right = Number(display), result = calculate(stored, right, operator);
    const entry = { expression: `${format(stored)} ${operator} ${format(right)}`, result: format(result), createdAt: Date.now() };
    setDisplay(entry.result); setStored(null); setOperator(null); setReplace(true);
    setHistory(current => {
      const updated = [entry, ...current].slice(0, 100);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* retain history in memory */ }
      return updated;
    });
  };
  const decimal = () => {
    if (replace || display === "Error") { setDisplay("0."); setReplace(false); }
    else if (!display.includes(".")) setDisplay(display + ".");
  };
  const keys: { text: string; run: () => void; type?: string }[] = [
    { text: "AC", run: clear, type: "muted" }, { text: "⌫", run: backspace, type: "muted" }, { text: "%", run: () => setDisplay(format(Number(display) / 100)), type: "muted" }, { text: "÷", run: () => choose("÷"), type: "op" },
    { text: "7", run: () => digit("7") }, { text: "8", run: () => digit("8") }, { text: "9", run: () => digit("9") }, { text: "×", run: () => choose("×"), type: "op" },
    { text: "4", run: () => digit("4") }, { text: "5", run: () => digit("5") }, { text: "6", run: () => digit("6") }, { text: "−", run: () => choose("−"), type: "op" },
    { text: "1", run: () => digit("1") }, { text: "2", run: () => digit("2") }, { text: "3", run: () => digit("3") }, { text: "+", run: () => choose("+"), type: "op" },
    { text: "±", run: () => setDisplay(current => current === "0" || current === "Error" ? current : current.startsWith("-") ? current.slice(1) : `-${current}`), type: "muted" },
    { text: "0", run: () => digit("0") }, { text: ".", run: decimal, type: "muted" }, { text: "=", run: equals, type: "equal" },
  ];

  return <section className="calc-popover" role="dialog" aria-label="Kalkulator">
    <header><div><b>Kalkulator</b><small>{stored !== null && operator ? `${format(stored)} ${operator}` : ""}</small></div><button type="button" className="calc-close" aria-label="Tutup kalkulator" onClick={onClose}>×</button></header>
    <output aria-live="polite">{display}</output>
    <div className="calc-keys">{keys.map(key => <button key={key.text} type="button" className={key.type ?? ""} onClick={key.run}>{key.text}</button>)}</div>
    <details className="calc-history"><summary>Riwayat kalkulasi ({history.length})</summary>
      {!history.length ? <p>Riwayat disimpan saat menekan =.</p> : <ol>{history.map((item, index) => <li key={`${item.createdAt}-${index}`}><span>{item.expression}</span><b>= {item.result}</b></li>)}</ol>}
    </details>
    <style jsx>{`
      .calc-popover{position:fixed;z-index:80;right:22px;bottom:22px;width:min(360px,calc(100vw - 24px));max-height:calc(100dvh - 40px);overflow:auto;padding:14px;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:17px;box-shadow:0 18px 60px rgb(0 0 0/.42)}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}header div{display:grid}header small{min-height:18px;color:var(--muted)}.calc-close{width:34px;height:34px;justify-content:center;padding:0;background:var(--surface-2);color:var(--text);font-size:1.35rem}output{display:block;min-height:58px;padding:10px 12px;margin-bottom:9px;overflow-x:auto;border-radius:9px;background:var(--surface-2);text-align:right;font:500 1.8rem/1.3 var(--font-mono,monospace);white-space:nowrap}.calc-keys{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--line)}.calc-keys button{min-height:48px;justify-content:center;padding:8px 3px;border-radius:0;background:var(--surface);color:var(--text);font-size:1rem}.calc-keys button.muted{background:var(--surface-2)}.calc-keys button.op{background:color-mix(in srgb,var(--primary) 22%,var(--surface));color:var(--primary)}.calc-keys button.equal{background:var(--primary);color:var(--primary-ink)}.calc-history{margin-top:10px;font-size:.82rem}.calc-history summary{cursor:pointer;color:var(--muted)}.calc-history ol{max-height:140px;overflow:auto;list-style:none;padding:0;display:grid;gap:5px}.calc-history li{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surface-2);border-radius:7px}.calc-history li span{color:var(--muted)}.calc-history li b{font-family:var(--font-mono,monospace)}.calc-history p{color:var(--muted)}@media(max-width:860px){.calc-popover{right:12px;bottom:calc(136px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 24px))}}
    `}</style>
  </section>;
}
