"use client";

import { useState } from "react";
import { CalculatorPopover } from "./calculator-popover";

export function CalculatorNavShortcut() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="calculator-sidebar-launch" type="button" aria-expanded={open} aria-label="Buka kalkulator" onClick={() => setOpen(value => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="2" /><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" /></svg>
      <span>Kalkulator</span>
    </button>
    {open && <CalculatorPopover onClose={() => setOpen(false)} />}
    <style jsx global>{`
      .calculator-sidebar-launch{position:fixed;z-index:46;left:14px;bottom:18px;width:244px;min-height:44px;display:flex;align-items:center;justify-content:flex-start;gap:12px;padding:10px 13px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--text);font:inherit;font-weight:600;cursor:pointer;text-align:left}
      .calculator-sidebar-launch:hover,.calculator-sidebar-launch[aria-expanded=true]{background:var(--surface-2);color:var(--primary)}
      .calculator-sidebar-launch svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
      .shell[data-collapsed=true] .calculator-sidebar-launch{width:48px;justify-content:center;padding:10px 8px}
      .shell[data-collapsed=true] .calculator-sidebar-launch span{display:none}
      @media(max-width:860px){.calculator-sidebar-launch{left:auto;right:14px;bottom:calc(82px + env(safe-area-inset-bottom));width:auto;min-height:42px;padding:10px 15px;border-color:var(--line);border-radius:999px;background:var(--primary);color:var(--primary-ink);box-shadow:0 8px 26px rgb(0 0 0/.22)}.calculator-sidebar-launch:hover,.calculator-sidebar-launch[aria-expanded=true]{background:var(--primary);color:var(--primary-ink);filter:brightness(1.08)}}
    `}</style>
  </>;
}
