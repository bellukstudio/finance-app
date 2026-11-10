import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font" });
export const metadata = { title: "Family Finance Manager" };
const themeInit = `try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`;
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}
