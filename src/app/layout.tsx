import "./globals.css";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono" });
export const metadata = { title: "Family Finance Manager" };
const themeInit = `try{var t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t}catch(e){}`;
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}
