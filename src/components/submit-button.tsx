"use client";
import { useFormStatus } from "react-dom";
/** Tombol submit yang menampilkan status proses saat server action berjalan. */
export function SubmitButton({ children, pending = "Memproses…", className }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending: p } = useFormStatus();
  return <button className={className} disabled={p} aria-busy={p}>{p ? pending : children}</button>;
}
