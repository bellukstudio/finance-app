"use client";

import Link from "next/link";

export function CalculatorNavShortcut() {
  return <Link className="calculator-nav-shortcut" href="/kalkulator" aria-label="Buka kalkulator">⌗ <span>Kalkulator</span>
    <style jsx>{`
      .calculator-nav-shortcut{position:fixed;z-index:45;right:18px;bottom:18px;display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid var(--line);border-radius:999px;background:var(--primary);color:var(--primary-ink);font-weight:700;box-shadow:0 8px 26px rgb(0 0 0/.22)}
      .calculator-nav-shortcut:hover{text-decoration:none;filter:brightness(1.08)}
      @media(max-width:860px){.calculator-nav-shortcut{bottom:calc(82px + env(safe-area-inset-bottom));right:14px;padding:10px 14px}}
    `}</style>
  </Link>;
}
