import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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

const themeInit = `try{var t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t}catch(e){}`;
export default async function Root({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;  // dari middleware (CSP berbasis nonce)
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}