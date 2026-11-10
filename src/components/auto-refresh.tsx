"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Muat ulang data server component secara berkala. Timer dibersihkan saat halaman ditinggalkan dan dijeda saat tab tersembunyi. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
