export const metadata = { title: "Family Finance Manager" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body style={{ fontFamily: "system-ui", maxWidth: 960, margin: "0 auto", padding: 16 }}>{children}</body></html>;
}
