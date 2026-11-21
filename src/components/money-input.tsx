"use client";

import { useMemo, useState } from "react";

type MoneyInputProps = {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
};

/** Displays Indonesian thousands separators while submitting a plain numeric value. */
export function MoneyInput({ name, defaultValue = "", placeholder = "0", required, min = 0, maxLength = 15, className, ariaLabel }: MoneyInputProps) {
  const initial = String(defaultValue ?? "").replace(/\D/g, "");
  const [raw, setRaw] = useState(initial);
  const shown = useMemo(() => raw ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(raw)) : "", [raw]);

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={shown}
        required={required}
        minLength={min > 0 ? 1 : undefined}
        maxLength={maxLength + Math.ceil(maxLength / 3) - 1}
        className={className}
        aria-label={ariaLabel ?? name}
        onChange={(event) => setRaw(event.target.value.replace(/\D/g, "").slice(0, maxLength))}\n        onBlur={() => { if (raw && Number(raw) < min) setRaw(String(min)); }}
      />
    </>
  );
}
