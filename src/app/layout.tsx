import "./global.css";

export const metadata = { title: "Family Finance Manager" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}