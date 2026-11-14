import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Family Finance Manager",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/apple-touch-icon.png" },
  // iOS tidak baca manifest.json untuk mode standalone; meta ini yang dipakai Safari.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Family Finance" },
};
// viewport-fit=cover + themeColor lewat Next Viewport API (bukan <meta> manual) supaya tidak dobel.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#060A12" };

// Tema disimpan di cookie `theme` (selain localStorage) supaya SERVER sudah menulis data-theme di HTML pertama.
// Sebelumnya tema baru dipasang oleh JavaScript setelah HTML tiba, sehingga setiap muat ulang halaman
// (mis. submit filter) sempat tampil terang sebelum jadi gelap. Skrip ini hanya fallback/migrasi dari localStorage.
const themeInit = `try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/),t=(m&&m[1])||localStorage.getItem("theme")||"dark",d=document.documentElement;if(d.dataset.theme!==t)d.dataset.theme=t;if(!m)document.cookie="theme="+t+";path=/;max-age=31536000;samesite=lax"}catch(e){}`;
export default async function Root({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;  // dari middleware (CSP berbasis nonce)
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="id" data-theme={theme} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}