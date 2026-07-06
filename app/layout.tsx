import type { Metadata, Viewport } from 'next';
import { Fraunces, Karla } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['opsz'],
});

const karla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
});

export const metadata: Metadata = {
  title: 'Zuleyka — Clóset personal',
  description: 'Tu armario digital: prendas, looks y sugerencias según el clima',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f1e8',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${fraunces.variable} ${karla.variable}`}>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
