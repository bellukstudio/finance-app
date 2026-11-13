"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved) as Entry[]);
    } catch {}
  }, []);

  const digit = (value: string) => {
    setDisplay((current) => replace || current === "0" || current === "Error" ? value : current.length < 16 ? current + value : current);
    setReplace(false);
  };
  const clear = () => { setDisplay("0"); setStored(null); setOperator(null); setReplace(false); };
  const backspace = () => {
    if (replace || display === "Error") { setDisplay("0"); setReplace(false); return; }
    setDisplay((current) => current.length <= 1 || (current.length === 2 && current.startsWith("-")) ? "0" : current.slice(0, -1));
  };
  const choose = (next: Operator) => {
    const value = Number(display);
    if (operator && stored !== null && !replace) {
      const result = calculate(stored, value, operator);
      setStored(result); setDisplay(format(result));
    } else {
      setStored(value);
    }
    setOperator(next); setReplace(true);
  };
  const equals = () => {
    if (!operator || stored === null || display === "Error") return;
    const right = Number(display);
    const result = calculate(stored, right, operator);
    const entry = { expression: `${format(stored)} ${operator} ${format(right)}`, result: format(result), createdAt: Date.now() };
    setDisplay(entry.result); setStored(null); setOperator(null); setReplace(true);
    setHistory((current) => {
      const updated = [entry, ...current].slice(0, 100);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };
  const decimal = () => {
    if (replace || display === "Error") { setDisplay("0."); setReplace(false); }
    else if (!display.includes(".")) setDisplay((current) => current + ".");
  };

  const valid = display !== "Error" && Number.isFinite(Number(display));
  const copyResult = async () => {
    if (!valid) return;
    try { await navigator.clipboard.writeText(display); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = display; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const useInTransaction = () => {
    if (!valid) return;
    const amount = Math.round(Math.abs(Number(display)));
    if (amount <= 0) return;
    window.dispatchEvent(new CustomEvent("calc:use-in-tx", { detail: { amount: String(amount) } }));
    onClose();
  };
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  };

  const keys: { text: string; run: () => void; className?: string }[] = [
    { text: "AC", run: clear, className: "muted" }, { text: "⌫", run: backspace, className: "muted" }, { text: "%", run: () => setDisplay(format(Number(display) / 100)), className: "muted" }, { text: "÷", run: () => choose("÷"), className: "op" },
    { text: "7", run: () => digit("7") }, { text: "8", run: () => digit("8") }, { text: "9", run: () => digit("9") }, { text: "×", run: () => choose("×"), className: "op" },
    { text: "4", run: () => digit("4") }, { text: "5", run: () => digit("5") }, { text: "6", run: () => digit("6") }, { text: "−", run: () => choose("−"), className: "op" },
    { text: "1", run: () => digit("1") }, { text: "2", run: () => digit("2") }, { text: "3", run: () => digit("3") }, { text: "+", run: () => choose("+"), className: "op" },
    { text: "±", run: () => setDisplay((current) => current === "0" || current === "Error" ? current : current.startsWith("-") ? current.slice(1) : `-${current}`), className: "muted" },
    { text: "0", run: () => digit("0") }, { text: ".", run: decimal, className: "muted" }, { text: "=", run: equals, className: "equal" },
  ];

  return (
    <section className="calc-popover" role="dialog" aria-label="Kalkulator">
      <header>
        <div>
          <b>Kalkulator</b>
          <small>{stored !== null && operator ? `${format(stored)} ${operator}` : ""}</small>
        </div>
        <button type="button" className="calc-close" aria-label="Tutup kalkulator" onClick={onClose}>×</button>
      </header>
      <output aria-live="polite">{display}</output>
      <div className="calc-keys">
        {keys.map((key) => <button key={key.text} type="button" className={key.className ?? ""} onClick={key.run}>{key.text}</button>)}
      </div>
      <div className="calc-actions">
        <button type="button" className="calc-del" onClick={clearHistory} disabled={!history.length}><Icon n="trash" /> Hapus riwayat</button>
        <div className="calc-actions-row">
          <button type="button" className="calc-copy" onClick={copyResult} disabled={!valid}><Icon n={copied ? "check" : "copy"} /> {copied ? "Tersalin" : "Copy"}</button>
          <button type="button" className="calc-use" onClick={useInTransaction} disabled={!valid || Math.round(Math.abs(Number(display))) <= 0}><Icon n="plus" /> Pakai di Transaksi</button>
        </div>
      </div>
      <details className="calc-history">
        <summary>Riwayat kalkulasi ({history.length})</summary>
        {!history.length ? <p>Riwayat disimpan saat menekan =.</p> : <ol>{history.map((item, index) => <li key={`${item.createdAt}-${index}`}><span>{item.expression}</span><b>= {item.result}</b></li>)}</ol>}
      </details>
      <style jsx>{`
        .calc-popover{
          position: fixed;
          right: 22px;
          bottom: 22px;
          width: min(360px, calc(100vw - 24px));
          max-height: calc(100dvh - 40px);
          overflow: auto;
          padding: 14px;
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 18px 60px rgb(0 0 0 / 0.42);
          z-index: 90;
        }
        header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        header div{display:grid;gap:2px}
        header b{font-size:1rem}
        header small{min-height:18px;color:var(--muted)}
        .calc-close{width:32px;height:32px;padding:0;border-radius:999px;background:var(--surface-2);color:var(--text);font-size:1.4rem;display:grid;place-items:center}
        output{display:block;min-height:56px;padding:10px 12px;margin-bottom:10px;border-radius:10px;background:var(--surface-2);font: 500 1.8rem/1.3 var(--font-mono, monospace);text-align:right;white-space:nowrap;overflow-x:auto}
        .calc-keys{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--line)}
        .calc-keys button{min-height:48px;border-radius:0;background:var(--surface);color:var(--text);font-size:1rem}
        .calc-keys button.muted{background:var(--surface-2)}
        .calc-keys button.op{background:color-mix(in srgb, var(--primary) 18%, var(--surface));color:var(--primary)}
        .calc-keys button.equal{background:var(--primary);color:var(--primary-ink)}
        .calc-actions{display:grid;gap:8px;margin-top:10px}
        .calc-actions-row{display:grid;grid-template-columns:auto 1fr;gap:8px}
        .calc-actions button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 14px;border-radius:10px;font-size:.9rem;font-weight:650;white-space:nowrap}
        .calc-actions button :global(svg){width:16px;height:16px;flex:none}
        .calc-actions button:disabled{opacity:.45;cursor:not-allowed}
        .calc-del{background:color-mix(in srgb,var(--expense) 14%,var(--surface));color:var(--expense);border:1px solid color-mix(in srgb,var(--expense) 30%,transparent)}
        .calc-copy{background:var(--surface-2);color:var(--text);border:1px solid var(--line)}
        .calc-use{background:var(--primary);color:var(--primary-ink)}
        .calc-history{margin-top:10px;font-size:.82rem}
        .calc-history summary{cursor:pointer;color:var(--muted)}
        .calc-history ol{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px;max-height:140px;overflow:auto}
        .calc-history li{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;border-radius:8px;background:var(--surface-2)}
        .calc-history li span{color:var(--muted)}
        .calc-history li b{font-family:var(--font-mono,monospace)}
        .calc-history p{margin:8px 0 0;color:var(--muted)}
        @media (max-width: 860px){
          .calc-popover{right:12px;bottom:calc(138px + env(safe-area-inset-bottom));}
        }
      `}</style>
    </section>
  );
}
