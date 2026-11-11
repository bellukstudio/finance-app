"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalculatorPopover } from "./calculator-popover";

export function CalculatorNavShortcut() {
  const [open, setOpen] = useState(false);
  const [topbar, setTopbar] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hostRef.current?.closest(".side")) return;

    const media = window.matchMedia("(max-width: 860px)");
    const updateTarget = () => setTopbar(media.matches ? document.querySelector<HTMLElement>(".topbar") : null);
    updateTarget();
    media.addEventListener("change", updateTarget);
    return () => media.removeEventListener("change", updateTarget);
  }, []);

  const button = (className = "calculator-nav-shortcut") => (
    <button type="button" className={className} aria-expanded={open} aria-label="Buka kalkulator" onClick={() => setOpen((v) => !v)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
        <path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2" />
      </svg>
      <span>Kalkulator</span>
    </button>
  );

  const popover = open && <CalculatorPopover onClose={() => setOpen(false)} />;

  return (
    <>
      <span ref={hostRef} className="calculator-nav-host">{button()}</span>
      {topbar && createPortal(button("calculator-nav-shortcut calculator-topbar-shortcut"), topbar)}
      {popover && (topbar ? createPortal(popover, document.body) : popover)}
      <style jsx global>{`
        .calculator-nav-host{display:contents}
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
          .side .calculator-nav-shortcut,
          .sheet .calculator-nav-shortcut{display:none}
          .topbar .ghost.ib{display:none}
          .calculator-topbar-shortcut{
            width:42px;
            min-width:42px;
            height:42px;
            min-height:42px;
            justify-content:center;
            padding:10px;
            border:0;
            border-radius:12px;
            background:transparent;
            color:var(--text);
          }
          .calculator-topbar-shortcut span{display:none}
          .calculator-topbar-shortcut:hover,
          .calculator-topbar-shortcut[aria-expanded=true]{
            border-color:transparent;
            background:var(--surface-2);
            color:var(--primary);
          }
        }
      `}</style>
    </>
  );
}
