import type { Metadata } from "next";
import Link from "next/link";
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
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <Link href="/"><img src="/logo.svg" alt="SL.OW" style={{ height: 36, width: 'auto' }} /></Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Link href="/inventory" style={{ fontSize: '0.8rem', color: '#6b6b7b', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Inventory
              </Link>
              <span style={{ fontSize: '0.8rem', color: '#6b6b7b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Wholesale
              </span>
            </nav>
          </div>
        </header>
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
