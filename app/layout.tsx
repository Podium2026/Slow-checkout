import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SL.OW — Wholesale Checkout",
  description: "Wholesale ordering with live DHL shipping rates",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#FBF9F3', color: '#25295B', fontWeight: 400 }}>
        <header className="bg-white border-b" style={{ borderColor: '#e5e2db' }}>
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src="/logo.svg" alt="SL.OW" style={{ height: 36, width: 'auto' }} />
            <span style={{ fontSize: '0.8rem', color: '#6b6b7b', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
              Wholesale
            </span>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
