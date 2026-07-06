'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    href: '/',
    label: 'Clóset',
    icon: (
      // gancho de ropa
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6a2 2 0 1 1 2-2" />
        <path d="M12 6v2" />
        <path d="M12 8 3.5 14.5a1.5 1.5 0 0 0 .9 2.7h15.2a1.5 1.5 0 0 0 .9-2.7L12 8Z" />
      </svg>
    ),
  },
  {
    href: '/hoy',
    label: 'Hoy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    href: '/outfits',
    label: 'Looks',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.6L18 9.5l-4.1 1.9L12 16l-1.9-4.6L6 9.5l4.1-1.9L12 3Z" />
        <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8L19 15Z" />
      </svg>
    ),
  },
  {
    href: '/calendario',
    label: 'Plan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/favorites',
    label: 'Favs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.2 0 5.3 3.1 4.1 6.3C19.5 15.4 12 20 12 20Z" />
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link href="/" className="brand">
            Zuleyka
            <small>clóset personal</small>
          </Link>
          <nav className="top-nav">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell">{children}</main>

      <nav className="tab-bar">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
