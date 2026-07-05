import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clóset de Zuleyka',
  description: 'Tu asistente de moda IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
          {children}
        </div>
      </body>
    </html>
  );
}
