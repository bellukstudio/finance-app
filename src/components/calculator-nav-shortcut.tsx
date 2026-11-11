"use client";

import { useState } from "react";
import { CalculatorPopover } from "./calculator-popover";

export function CalculatorNavShortcut() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="calculator-nav-shortcut" aria-expanded={open} aria-label="Buka kalkulator" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
          <path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2" />
        </svg>
        <span>Kalkulator</span>
      </button>
      {open && <CalculatorPopover onClose={() => setOpen(false)} />}
      <style jsx global>{`
        .calculator-nav-shortcut{
          width: 100%;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: border-color .15s ease, background .15s ease, color .15s ease;
        }
        .calculator-nav-shortcut:hover,
        .calculator-nav-shortcut[aria-expanded=true]{
          border-color: color-mix(in srgb, var(--primary) 52%, var(--line));
          background: color-mix(in srgb, var(--primary) 12%, var(--surface));
          color: var(--primary);
        }
        .calculator-nav-shortcut svg{
          width: 18px;
          height: 18px;
          flex: none;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .calculator-nav-shortcut span{white-space: nowrap}
        .shell[data-collapsed=true] .calculator-nav-shortcut{justify-content:center;padding:10px 8px}
        .shell[data-collapsed=true] .calculator-nav-shortcut span{display:none}
        @media (max-width: 860px){
          .calculator-nav-shortcut{
            position: fixed;
            right: 14px;
            bottom: calc(84px + env(safe-area-inset-bottom));
            left: auto;
            width: auto;
            min-width: 110px;
            border-radius: 999px;
            padding: 10px 14px;
            background: var(--primary);
            color: var(--primary-ink);
            border-color: transparent;
            box-shadow: 0 10px 26px rgb(0 0 0/.18);
          }
          .calculator-nav-shortcut:hover,
          .calculator-nav-shortcut[aria-expanded=true]{
            background: var(--primary);
            color: var(--primary-ink);
            filter: brightness(1.08);
          }
        }
      `}</style>
    </>
  );
}
