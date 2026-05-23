import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Prowider' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900 text-sm">Prowider</Link>
          <Link href="/request-service" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Request service
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/test-tools" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Test tools
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}